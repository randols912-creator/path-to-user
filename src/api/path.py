import sys, os
from sanic.log import logger
from api.geni import GeniClientAsync
from api.profile import ProfileManager
from api.models import CURRENT_TIMESTAMP, paths_table, profiles_table
from sqlalchemy import and_, select, join, func, distinct
from databases import Database
from asyncio import Queue, sleep as asyncio_sleep
import datetime
import random

PENDING_TIMEOUT = int(os.environ.get('PENDING_TIMEOUT', 2))
PATH_FIND_BATCH = int(os.environ.get('PATH_FIND_BATCH', 10))

class Task:
    def __init__(self, data: dict, priority: int) -> None:
        self.data = data
        self.priority = priority

    def __lt__(self, other):
        return self.priority < other.priority


class PathManager:
    def __init__(self, database: Database, geni: GeniClientAsync, token: str,
                 user2user_result_queue: Queue = None):
        self.geni = geni
        self.database = database
        self.token = token
        self.user2user_result_queue = user2user_result_queue

        self.profile_mgr = ProfileManager(database, geni, token)
        # self.source_profile, self.token = geni.get_profile_details(token)

    async def find(self, source_id: str, target_id: str):

        # First, save source profile to DB (if not saved yet). TODO: save outside of PathFinder
        # self._save_profile(session, self.source_profile)
        # Call Geni API to find path between source and target profiles
        result, self.token = await self.geni.get_path_to(source_id, target_id, self.token)

        logger.debug("[{}] Status for {} -> {}".format(os.getpid(), target_id, result.get('status')))
        # Save resulted path (or its pending status) to DB
        pending = result.get('status') == 'pending' or result['is_success'] == False
        # Pending can be changed by timeout during save
        pending = await self._save_path(source_id, target_id, result, pending=pending)

        return pending

    async def find_batch(self, task_list):

        # First, save source profile to DB (if not saved yet). TODO: save outside of PathFinder
        # self._save_profile(session, self.source_profile)
        # Call Geni API to find path between source and target profiles
        results = await self.geni.get_batch_path_to(task_list)

        logger.debug("[{}] Status for {} -> {}".format(os.getpid(), task_list, results))
        # Pending can be changed by timeout during save
        pending_list = await self._save_path_batch(task_list, results)
        return pending_list


    async def get(self, source_id: str, target_id: str):
        query = paths_table.select().where(
            and_(paths_table.c.source_id == source_id, paths_table.c.target_id == target_id))
        path = await self.database.fetch_one(query=query)
        return path

    async def get_paths(self, source_id: str,
                        offset: int,
                        limit: int,
                        connected_only=True,
                        ready_only=False,
                        target_id=None,
                        user2user=False):
        j = join(profiles_table, paths_table,
                 profiles_table.c.id == paths_table.c.target_id)
        step_count_cond = (paths_table.c.step_count >
                           0) if connected_only else True
        ready_only_cond = paths_table.c.finished_on != None if ready_only else True
        target_id_cond = paths_table.c.target_id == target_id if target_id else True
        query = select([paths_table.c.source_id,
                        paths_table.c.target_id,
                        paths_table.c.step_count,
                        profiles_table.c.bh_theme,
                        profiles_table.c.bh_location,
                        profiles_table.c.bh_floor,
                        profiles_table.c.details.label("target_profile")]).select_from(j) \
            .where(
            and_(paths_table.c.source_id == source_id,
                 paths_table.c.is_user2user == user2user,
                 step_count_cond,
                 ready_only_cond,
                 target_id_cond))\
            .order_by(paths_table.c.finished_on).offset(offset)

        if limit:
            query = query.limit(limit)

        paths = await self.database.fetch_all(query=query)
        return paths


    async def count_paths(self, source_id: str, connected_only=True, user2user=False):
        step_count_cond = (paths_table.c.step_count >
                           0) if connected_only else True
        query = select([func.count(distinct(paths_table.c.target_id))]).where(
            and_(paths_table.c.source_id == source_id,
                 paths_table.c.is_user2user == user2user,
                 step_count_cond)
        )
        count = await self.database.fetch_one(query=query)
        return count[0]

    async def _save_profile(self, profile):
        query = profiles_table.select().where(profiles_table.c.id==profile['id'])
        profile_db = await self.database.fetch_one(query=query)
        if not profile_db:
            query = profiles_table.insert().values({'name': profile['name'],
                                                    'id': profile['id'],
                                                    'url': profile['url']})
            await self.database.execute(query)

    async def _save_path(self, source_id, target_id, result, pending: bool):
        path = await self.get(source_id, target_id)

        values = {
            'source_id': source_id,
            'target_id': target_id,
            'url': result.get('url', ''),
            'step_count': result.get('step_count', 0),
            'relationship': result.get('relationship', ''),
            'relations': result.get('relations', ''),
            'updated_on': CURRENT_TIMESTAMP
        }
        logger.debug("values: ", values)

        # Checking pending timeout
        if path and pending and self._is_pending_timeout(path):
            pending = False

        if not pending:
            values['finished_on'] = CURRENT_TIMESTAMP

        # Insert or update
        if not path:
            values['is_user2user'] = await self.is_user2user(source_id, target_id) # needed only on insert
            query = paths_table.insert().values(values)
        else:
            values['is_user2user'] = path['is_user2user']
            query = paths_table.update().where(paths_table.c.id==path['id']).values(values)
        logger.debug(query)
        await self.database.execute(query)

        # Communicate found user2user connection via the queue to the main task
        if values['step_count'] > 0 and values['is_user2user'] and self.user2user_result_queue:
            await self.user2user_result_queue.put(values)

        return pending

    async def _save_path_batch(self, task_list, result_list):
        values_list = []
        pending_task_list = []
        for task,(result,token) in zip(task_list, result_list):
            source_id,target_id,is_user2user,pending_ts,token = task.data.values()
            # Calculate pending status
            pending = (result.get('status') == 'pending' or result['is_success'] == False) \
                      and not self._is_pending_timeout(pending_ts)
            if pending:
                if not task.data.get('pending_ts'):
                    task.data['pending_ts'] = datetime.datetime.now()
                pending_task_list.append(task)
                continue

            values = {
                'source_id': source_id,
                'target_id': target_id,
                'is_user2user': is_user2user,
                'url': result.get('url', ''),
                'step_count': result.get('step_count', 0),
                'relationship': result.get('relationship', ''),
                'relations': result.get('relations', ''),
                'updated_on': CURRENT_TIMESTAMP,
                'finished_on': CURRENT_TIMESTAMP
            }
            values_list.append(values)

            # Communicate found user2user connection via the queue to the main task
            if values['step_count'] > 0 and values['is_user2user'] and self.user2user_result_queue:
                await self.user2user_result_queue.put(values)

        query = paths_table.insert()
        logger.debug(query)
        logger.debug(f"values: {values_list}")
        if values_list:
            await self.database.execute_many(query, values_list)

        return pending_task_list

    async def is_user2user(self, source_id, target_id):
        for profile_id in [target_id, source_id]:  # target id is usually personality id, so start with it
            profile = await self.profile_mgr.get(profile_id)
            if not profile.is_user:
                return False
        return True

    @staticmethod
    def _is_pending_timeout(timestamp):
        if not timestamp: return False
        is_pending_timeout = (datetime.datetime.now() - timestamp).total_seconds() / 60 > PENDING_TIMEOUT
        return is_pending_timeout


async def path_finder_async(number, queue, user2user_result_queue, db_url, geni):
    logger.info(f"Starting process: {number}")
    cycles = 0
    async with Database(db_url) as database:
        while True:
            logger.info(f"Waiting for the next tasks")
            priority,task_or_list = await queue.get()
            if isinstance(task_or_list, Task):
                task_or_list = [task_or_list]
            logger.info(f"Received  {len(task_or_list)} tasks, queue size: {queue.qsize()}")

            # since values insertion ordered
            try:
                pm = PathManager(database, geni, None, user2user_result_queue)
                pending_list = await pm.find_batch(task_or_list)
            except:
                # If any exception happened during processing, refer to all batch as 'pending'
                pending_list = task_or_list
            # Enqueue pending list
            if pending_list:
                await queue.put((priority+10, pending_list))
                logger.error(f"Pending list size: {len(pending_list)}, queue size after adding pending: {queue.qsize()}")

            cycles += len(task_or_list)

            logger.info(
                    f"W{os.getpid()}:P{number}, priority: {priority}, source_id: {task_or_list[0].data['source_id']}")
            logger.info(f"Cycles: {cycles}, Queue size: {queue.qsize()}")


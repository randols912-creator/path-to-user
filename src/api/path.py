import sys, os
from sanic.log import logger
from api.geni import GeniClientAsync
from api.models import CURRENT_TIMESTAMP, paths_table, profiles_table
from sqlalchemy import and_, select, join
from databases import Database

PENDING_TIMEOUT = int(os.environ.get('PENDING_TIMEOUT', 2))

class Task:
    def __init__(self, data: dict, priority: int) -> None:
        self.data = data
        self.priority = priority

    def __lt__(self, other):
        return self.priority < other.priority


class PathManager:
    def __init__(self, database: Database, geni: GeniClientAsync, token: str):
        self.geni = geni
        self.database = database
        self.token = token
        # self.source_profile, self.token = geni.get_profile_details(token)

    async def find(self, source_id: str, target_id: str):

        # First, save source profile to DB (if not saved yet). TODO: save outside of PathFinder
        # self._save_profile(session, self.source_profile)
        # Call Geni API to find path between source and target profiles
        result, self.token = await self.geni.get_path_to(source_id, target_id, self.token)

        logger.info("[{}] Status for {} -> {}".format(os.getpid(), target_id, result.get('status')))
        # Save resulted path (or its pending status) to DB
        pending = result.get('status') == 'pending' or result['is_success'] == False
        # Pending can be changed by timeout during save
        pending = await self._save_path(source_id, target_id, result, pending=pending)

        return pending

    async def get(self, source_id: str, target_id: str):
        query = paths_table.select().where(
            and_(paths_table.c.source_id == source_id, paths_table.c.target_id == target_id))
        path = await self.database.fetch_one(query=query)
        return path

    async def get_personalities_paths(self, source_id: str, offset: int, limit: int, connected_only=True, ready_only=False, target_id=None):
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
                        profiles_table.c.details.label("target_profile")]).select_from(j) \
            .where(
            and_(paths_table.c.source_id == source_id, step_count_cond, ready_only_cond, target_id_cond))\
            .order_by(paths_table.c.finished_on).offset(offset)

        if limit:
            query = query.limit(limit)

        paths = await self.database.fetch_all(query=query)
        return paths

    async def count_personalities_paths(self, source_id: str, connected_only=True):
        return len(await self.get_personalities_paths(source_id, 0, 0, connected_only, ready_only=True))

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
        if path and pending and _is_pending_timeout(path):
            pending = False

        if not pending:
            values['finished_on'] = CURRENT_TIMESTAMP

        # Insert or update
        if not path:
            query = paths_table.insert().values(values)
        else:
            query = paths_table.update().where(paths_table.c.id==path['id']).values(values)
        logger.debug(query)
        await self.database.execute(query)

        return pending


async def path_finder_async(number, queue, db_url, geni):
    logger.info(f"Starting process: {number}")
    async with Database(db_url) as database:
        while True:
            task: Task = await queue.get()
            # since values insertion ordered
            source_id, target_id, token = task.data.values()
            pm = PathManager(database, geni, token)
            pending = await pm.find(source_id, target_id)
            if pending:
                await queue.put(task)


def _is_pending_timeout(path):
    is_pending_timeout = (
        path.updated_on - path.created_on).total_seconds() / 60 > PENDING_TIMEOUT

    if is_pending_timeout:
        logger.info(f'Stopped search for path {path}! Took more than {PENDING_TIMEOUT} minutes.')

    return is_pending_timeout

import sys, os
import logging
from api.geni import GeniClient, GeniClientAsync
from api.models import CURRENT_TIMESTAMP, paths_table, profiles_table
from sqlalchemy import and_
from databases import Database

import asyncio
import random

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

        logging.info("[{}] Status for {} -> {}".format(os.getpid(), target_id, result.get('status')))
        # Save resulted path (or its pending status) to DB
        pending = result.get('status') == 'pending' or result['is_success'] == False
        await self._save_path(source_id, target_id, result, pending=pending)

        return pending

    async def get(self, source_id: str, target_id: str):
        query = paths_table.select().where(
            and_(paths_table.c.source_id == source_id, paths_table.c.target_id == target_id))
        path = await self.database.fetch_one(query=query)
        return path

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

        values = {'source_id': source_id,
                  'target_id': target_id,
                  'url': result.get('url', ''),
                  'step_count': result.get('step_count', 0),
                  'relationship': result.get('relationship', ''),
                  'relations': result.get('relations', '')}
        print("values: ", values)
        if not pending:
            values['finished_on'] = CURRENT_TIMESTAMP
        # Insert or update
        if not path:
            query = paths_table.insert().values(values)
        else:
            query = paths_table.update().where(paths_table.c.id==path['id']).values(values)
        print(query)
        await self.database.execute(query)


async def path_finder_worker(number, queue, db_url, geni):
    logging.basicConfig(format='%(asctime)s:%(levelname)s:%(message)s', level=logging.DEBUG)
    logging.info(f"Starting watchdog {number}")
    # print to main stdout
    sys.stdout.flush()

    while True:
        task = queue.get()
        # Find path
        async with Database(db_url) as database:
            pm = PathManager(database, geni, task['token'])
            pending = await pm.find(task['source_id'], task['target_id'])
            if pending:
                queue.put(task)

async def path_finder_async(number, queue, db_url, geni):
    logging.info(f"Starting process: {number}")
    async with Database(db_url) as database:
        while True:
            task = await queue.get()
            pm = PathManager(database, geni, task['token'])
            # find_coro = pm.find(task['source_id'], task['target_id'])
            # tasks.append(task)
            # coros.append(find_coro)
            # if len(tasks) >= 25:
            #     responses = await asyncio.gather(*coros)
            #     for task, pending in zip(tasks,responses):
            #         if pending:
            #             await queue.put(task)
            #     tasks.clear()
            #     coros.clear()
            #pending = await asyncio.create_task(pm.find(task['source_id'], task['target_id']))
            pending = await pm.find(task['source_id'], task['target_id'])
            if pending:
                await queue.put(task)
            # simulate i/o operation using sleep
            await asyncio.sleep(random.random())
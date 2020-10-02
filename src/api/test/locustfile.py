import asyncio
import logging
import time

from locust import constant, task
from locust.contrib.fasthttp import FastHttpUser

URLS = {
    'paths': '/api/v1/paths/personalities',
    'paths_count': '/api/v1/paths/personalities/count',
    'profiles_count': '/api/v1/profiles/count'
}


class GeniTestUser(FastHttpUser):
    wait_time = constant(1)

    @task
    def new_profile_setup(self):
        from uuid import uuid4

        token = str(uuid4())

        fetched_relations = set()

        paths, paths_count, profiles_count, total_paths_count = self._perform_cycle_requests(
            token)

        if not paths_count:
            logging.info(f'{token}: Source or target profiles are empty')
            self._trigger_backend_workers(token)

        logging.info('Interval fetch enabled')

        while len(fetched_relations) < paths_count or total_paths_count < profiles_count:
            time.sleep(1)

            paths, paths_count, profiles_count, total_paths_count = self._perform_cycle_requests(
                token,
                len(fetched_relations)
            )

            if len(paths):
                logging.info(f'{token}: New {len(paths)} paths arived')
                fetched_relations.update(
                    {p['target_id'] for p in paths}
                )
                logging.info(
                    f'{token}: Total {len(fetched_relations)} relations fetched')

        logging.info(f'{token}: Interval fetch disabled')

    def _trigger_backend_workers(self, token):
        status = self.client.post(URLS['paths'],
                                  headers={'authorization': token}).json()['status']
        logging.info(f'{token}: {status}')

    def _perform_cycle_requests(self, token, offset=0):
        headers = {'authorization': token}

        return (
            self.client.get(f"{URLS['paths']}?offset={offset}",
                            headers=headers).json()['paths'],
            self.client.get(URLS['paths_count'],
                            headers=headers).json()['count'],
            self.client.get(URLS['profiles_count'],
                            headers=headers).json()['count'],
            self.client.get(f"{URLS['paths_count']}?connected_only=false",
                            headers=headers).json()['count'],
        )

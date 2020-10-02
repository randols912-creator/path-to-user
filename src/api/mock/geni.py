import asyncio
import random

from .timeouts import TIMEOUTS


class GeniClientAsync:
    async def validate_token(self, token):
        await asyncio.sleep(
            random.choice(TIMEOUTS['validate_token'])
        )

        return True

    async def get_path_to(self, source_id, target_id, token):
        status = random.choices(['pending', 'done'], weights=[0.1, 0.75])[0]

        result = new_result(status)
        if status == 'done':
            result = generate_random_path(result)

        await asyncio.sleep(
            random.choice(TIMEOUTS['get_path_to'])
        )

        return result, token

    async def get_personalities_profiles(self, token, next_page_url=None):
        pass

    def build_auth_url(self):
        pass

    async def get_profile_details(self, token, profile_id="profile"):
        profile_raw = new_result('status')
        profile_raw.update({
            'id': token,
            'url': token,
            'guid': token,
            'name': token
        })

        await asyncio.sleep(
            random.choice(TIMEOUTS['get_profile_details'])
        )

        return profile_raw, token

    async def _geni_api_call(self, url, token, fields=None):
        pass

    async def _get_token(self, code=None, refresh_token=None):
        pass


def new_result(status):
    return {
        'api_errors': [],
        'internal_errors': [],
        'is_success': True,
        'status': status
    }


def generate_random_path(result):
    step_count = random.choices([0, 10], weights=[0.2, 0.75])[0]

    if step_count:
        step_count = random.randint(step_count, 200)

    result.update({
        "inlaw_distance": 4,
        "relations": [
            {
                "name": "name",
                "relation": "relation",
                "url": "url"
            } for _ in range(step_count)
        ],
        "relationship": "relationship",
        "step_count": step_count,
        "url": "url"
    })

    return result

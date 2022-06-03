import asyncio
import os, time
import requests
import aiohttp
import logging


class GeniClientAsync:
    REDIRECT_URL = os.getenv('GENI_REDIRECT_URL', 'http://localhost:5050/home')
    CLIENT_ID = os.getenv('GENI_CLIENT_ID', 'eYis8xWUg8AoILdkT1GsmuwO9PTFFQrECLaNSONt')
    CLIENT_SECRET = os.getenv('GENI_CLIENT_SECRET', '2lcQWKBT3urNPIqprZpBZVcWU9JRQkQvbZ5TUDHH')
    BASE_URL = 'https://www.geni.com/'
    AUTH_URL = 'platform/oauth/authorize'
    TOKEN_URL = 'platform/oauth/request_token'
    VALIDATE_TOKEN_URL = 'platform/oauth/validate_token'
    PROFILE_URL = 'api/{profile}'
    PROJECT_URL = 'api/{project}'
    PATH_BETWEEN_PROFILES_URL = 'api/{source}/path-to/{target}?skip_email=1&skip_notify=1'
    PROFILES_FROM_PROJECT = 'api/{project_id}/profiles'

    def __init__(self):
        self.session = requests.session()

    async def validate_token(self, token):
        url = self.BASE_URL + self.VALIDATE_TOKEN_URL

        result, token = await self._geni_api_call(url, token)
        return result['is_success']

    async def get_path_to(self, source_id, target_id, token):
        url = self.BASE_URL + self.PATH_BETWEEN_PROFILES_URL

        url = url.replace(
            '{source}', source_id
        ).replace('{target}', target_id)
        status, token = await self._geni_api_call(url, token)

        return status, token

    async def get_batch_path_to(self, task_list):
        requests = []
        for task in task_list:
            requests.append(self.get_path_to(task.data['source_id'],
                                             task.data['target_id'],
                                             task.data['token']))
        status_list = await asyncio.gather(*requests)
        return status_list



    async def get_personalities_profiles(self, token, next_page_url=None, project_id='project-56250'):
        url: str = self.BASE_URL + self.PROFILES_FROM_PROJECT.format(project_id=project_id) if not next_page_url else next_page_url
        profiles = []
        fields = [
            'id',
            'name',
            'names',
            'url',
            'first_name',
            'last_name',
            'maiden_name',
            'gender',
            'photo_urls',
            'birth',
            'death',
            'nicknames'
        ]
        counter = 0
        while counter < 5:
            part_profiles, token = await self._geni_api_call(url, token, fields)

            if part_profiles['is_success']:
                break

            counter += 1
            await asyncio.sleep(0.25)

        next_page_url = part_profiles.get('next_page')
        print(part_profiles)
        if part_profiles['is_success']:
            profiles += part_profiles['results']

        return profiles, next_page_url, part_profiles.get('total_count')

    def build_auth_url(self):
        """Create the OAuth url for the application"""
        params = {
            'client_id': self.CLIENT_ID,
            'response_type' : 'token',
            'display': 'mobile'
            #'redirect_uri': self.REDIRECT_URL
        }
        params = '&'.join(['%s=%s' % (k, v) for k, v in params.items()])
        url = f'{self.BASE_URL}{self.AUTH_URL}?{params}'

        return url

    async def get_profile_details(self, token, profile_id=None, fields=None):
        if not profile_id: profile_id = "profile"
        """Get the profile details. By default, return details of logged in account"""
        url = self.BASE_URL + self.PROFILE_URL.format(profile=profile_id)
        counter = 0

        while counter < 5:
            profile_raw, token = await self._geni_api_call(url, token, fields)

            if profile_raw['is_success']:
                break

            counter += 1
            await asyncio.sleep(0.25)

        return profile_raw, token

    async def get_project_details(self, token, project_id=None, fields=None):
        if not project_id: project_id = "project"
        """Get the profile details. By default, return details of logged in account"""
        url = self.BASE_URL + self.PROJECT_URL.format(project=project_id)
        counter = 0

        while counter < 5:
            project_raw, token = await self._geni_api_call(url, token, fields)

            if project_raw['is_success']:
                break

            counter += 1
            await asyncio.sleep(0.25)

        return project_raw, token

    # TODO: limit call rate (by token) to 25 calls in 10 seconds
    async def _geni_api_call(self, url, token, fields=None):
        result = {
            'api_errors': [],
            'internal_errors': [],
            'is_success': False
        }

        payload = {'access_token': token} if token else dict()
        if fields is not None:
            payload['fields'] = ','.join(fields)

        try:
            #response_raw = self.session.get(url, params=payload, timeout=20)
            #print(f'querying {url} {payload}')
            logging.debug(f"Geni API call: {url} {payload}")
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=payload) as response_raw:
                    response = await response_raw.json()

            if response.get('error'):
                result['api_errors'].append(response['error'])

                if response['error']['type'] == 'OAuthException':
                    await self._get_token(token['refresh_token'])

            elif (
                response_raw.status == 200
                or response_raw.status == 403
            ):
                result.update(response)
                result['is_success'] = True

        except Exception as error:
            result['internal_errors'].append(error)

        return result, token

    async def _get_token(self, code=None, refresh_token=None):
        """
        Get or refresh token.
        """
        token_result = {}
        url = self.BASE_URL + self.TOKEN_URL
        params = {
            'client_id': self.CLIENT_ID
        }

        if refresh_token:
            params.update({
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token
            })

        else:
            params.update({
                'client_secret': self.CLIENT_SECRET,
                'code': code,
                'redirect_url': self.REDIRECT_URL
            })

        #response = self.session.get(url, params=params).json()
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response_raw:
                response = await response_raw.json()
        token_result['access_token'] = response['access_token']
        token_result['refresh_token'] = response['refresh_token']

        if code:
            token_result['tokenExpiration'] = response['expires_in']

        return token_result


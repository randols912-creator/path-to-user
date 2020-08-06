import os, time
import requests
from ratelimit import limits, sleep_and_retry


class GeniClient:
    REDIRECT_URL = os.getenv('GENI_REDIRECT_URL', 'http://localhost:5050/home')
    CLIENT_ID = os.getenv('GENI_CLIENT_ID', 'eYis8xWUg8AoILdkT1GsmuwO9PTFFQrECLaNSONt')
    CLIENT_SECRET = os.getenv('GENI_CLIENT_SECRET', '2lcQWKBT3urNPIqprZpBZVcWU9JRQkQvbZ5TUDHH')
    BASE_URL = 'https://www.geni.com/'
    AUTH_URL = 'platform/oauth/authorize'
    TOKEN_URL = 'platform/oauth/request_token'
    PROFILE_URL = 'api/profile?fields=id,name,guid,url'
    PATH_BETWEEN_PROFILES_URL = 'api/{source}/path-to/{target}?skip_email=1&skip_notify=1'
    PROFILES_FROM_PROJECT = 'api/project-56250/profiles'

    def __init__(self):
        self.session = requests.session()

    async def get_path_to(self, source_id, target_id, token):
        url = self.BASE_URL + self.PATH_BETWEEN_PROFILES_URL

        url = url.replace(
            '{source}', source_id
        ).replace('{target}', target_id)
        status, token = self._geni_api_call(url, token)

        return status, token

    def get_personalities_profiles(self, token, next_page_url=None):
        url: str = self.BASE_URL + self.PROFILES_FROM_PROJECT if not next_page_url else next_page_url
        profiles = []
        fields = [
            'id',
            'name',
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
        print(f'querying {url}')
        part_profiles, token = self._geni_api_call(url, token, fields)
        next_page_url = part_profiles.get('next_page')
        print(part_profiles)
        if part_profiles['is_success']:
            profiles += part_profiles['results']

        return profiles, next_page_url

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

    def get_profile_details(self, token):
        """Get the profile details for the logged in account"""
        url = self.BASE_URL + self.PROFILE_URL
        counter = 0

        while counter < 5:
            profile_raw, token = self._geni_api_call(url, token)

            if profile_raw['is_success']:
                break

            counter += 1
            time.sleep(3.0)

        return profile_raw, token

    # TODO: limit call rate (by token) to 25 calls in 10 seconds
    def _geni_api_call(self, url, token, fields=None):
        result = {
            'api_errors': [],
            'internal_errors': [],
            'is_success': False
        }

        payload = {'access_token': token} if token else dict()
        if fields is not None:
            payload['fields'] = ','.join(fields)

        try:
            response_raw = self.session.get(url, params=payload, timeout=20)
            response = response_raw.json()

            if response.get('error'):
                result['api_errors'].append(response['error'])

                if response['error']['type'] == 'OAuthException':
                    self._get_token(token['refresh_token'])

            elif (
                response_raw.status_code == 200
                or response_raw.status_code == 403
            ):
                result.update(response)
                result['is_success'] = True

        except Exception as error:
            result['internal_errors'].append(error)

        return result, token

    def _get_token(self, code=None, refresh_token=None):
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

        response = self.session.get(url, params=params).json()
        token_result['access_token'] = response['access_token']
        token_result['refresh_token'] = response['refresh_token']

        if code:
            token_result['tokenExpiration'] = response['expires_in']

        return token_result


import aiohttp


class GeniClientAsync:
    REDIRECT_URL = os.getenv('GENI_REDIRECT_URL', 'http://localhost:5050/home')
    CLIENT_ID = os.getenv('GENI_CLIENT_ID', 'eYis8xWUg8AoILdkT1GsmuwO9PTFFQrECLaNSONt')
    CLIENT_SECRET = os.getenv('GENI_CLIENT_SECRET', '2lcQWKBT3urNPIqprZpBZVcWU9JRQkQvbZ5TUDHH')
    BASE_URL = 'https://www.geni.com/'
    AUTH_URL = 'platform/oauth/authorize'
    TOKEN_URL = 'platform/oauth/request_token'
    PROFILE_URL = 'api/profile?fields=id,name,guid,url'
    PATH_BETWEEN_PROFILES_URL = 'api/{source}/path-to/{target}?skip_email=1&skip_notify=1'
    PROFILES_FROM_PROJECT = 'api/project-56250/profiles'

    def __init__(self):
        self.session = requests.session()

    async def get_path_to(self, source_id, target_id, token):
        url = self.BASE_URL + self.PATH_BETWEEN_PROFILES_URL

        url = url.replace(
            '{source}', source_id
        ).replace('{target}', target_id)
        status, token = await self._geni_api_call(url, token)

        return status, token

    async def get_personalities_profiles(self, token, next_page_url=None):
        url: str = self.BASE_URL + self.PROFILES_FROM_PROJECT if not next_page_url else next_page_url
        profiles = []
        fields = [
            'id',
            'name',
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
        print(f'querying {url}')
        part_profiles, token = await self._geni_api_call(url, token, fields)
        next_page_url = part_profiles.get('next_page')
        print(part_profiles)
        if part_profiles['is_success']:
            profiles += part_profiles['results']

        return profiles, next_page_url

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

    async def get_profile_details(self, token):
        """Get the profile details for the logged in account"""
        url = self.BASE_URL + self.PROFILE_URL
        counter = 0

        while counter < 5:
            profile_raw, token = await self._geni_api_call(url, token)

            if profile_raw['is_success']:
                break

            counter += 1
            time.sleep(3.0)

        return profile_raw, token

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


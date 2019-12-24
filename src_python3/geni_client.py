# pylint: disable=line-too-long

import os, time
import requests
from ratelimit import limits, sleep_and_retry


class GeniClient:
    REDIRECT_URL = os.getenv('GENI_REDIRECT_URL', 'http://localhost:5050/home')
    CLIENT_ID = os.getenv('GENI_CLIENT_ID', 'tUwZAls5rg6euVuiWKWibPzUCY0twJIuXc7qfdS3')
    CLIENT_SECRET = os.getenv('GENI_CLIENT_SECRET', 'AATGHLSwFITr5E0jEkcrTKYday2bJHwu3BPkwtZO')
    BASE_URL = 'https://www.geni.com/'
    AUTH_URL = 'platform/oauth/authorize'
    TOKEN_URL = 'platform/oauth/request_token'
    PROFILE_URL = 'api/profile/immediate-family?fields=id,deleted,merged_into,name,guid'
    PATH_BETWEEN_PROFILES_URL = 'api/profile-{source}/path-to/profile-{target}?skip_email=1&skip_notify=1'
    PROFILES_FROM_PROJECT = 'api/project-56250/profiles'

    def get_geni_path_to(self, source_id, target_id, token):
        url = self.BASE_URL + self.PATH_BETWEEN_PROFILES_URL

        url = url.replace(
            '{source}', source_id
        ).replace('{target}', target_id)
        status, token = self.geni_api_call(url, token)

        return status, token

    def get_target_profiles(self, token):
        url: str = self.BASE_URL + self.PROFILES_FROM_PROJECT
        profiles = []

        while url:
            part_profiles, token = self.geni_api_call(url, token)
            url = part_profiles.get('next_page')

            if part_profiles['is_success']:
                profiles += part_profiles['results']

        return profiles, token

    def build_auth_url(self):
        """Create the OAuth url for the application"""
        params = {
            'client_id': self.CLIENT_ID,
            'redirect_uri': self.REDIRECT_URL
        }
        params = '&'.join(['%s=%s' % (k, v) for k, v in params.items()])
        url = f'{self.BASE_URL}{self.AUTH_URL}?{params}'

        return url

    def get_profile_details(self, token):
        """Get the profile details for the logged in account"""
        url = self.BASE_URL + self.PROFILE_URL
        profile_raw, token = self.geni_api_call(url, token)
        if not profile_raw['is_success']:
            profile_raw = {}

        return profile_raw, token

    @sleep_and_retry
    @limits(calls=15, period=60)
    def geni_api_call(self, url, token):
        result = {
            'api_errors': [],
            'internal_errors': [],
            'is_success': False
        }
        payload = {'access_token': token['access_token']}

        retry_count = 0
        while retry_count < 10:
            retry_count += 1

            try:
                response_raw = requests.get(url, params=payload, timeout=10)
                response = response_raw.json()

                if response.get('error'):
                    result['api_errors'].append(response['error'])

                    if response['error']['type'] == 'OAuthException':
                        self.get_token(token['refresh_token'])
                        payload = {'access_token': token['access_token']}

                    elif response['error']['type'] == 'ApiException':
                        if response['error']['message'] != 'Rate limit exceeded.':
                            result['is_success'] = False
                            break

                elif (
                    response_raw.status_code == 200
                    or response_raw.status_code == 403
                ):
                    result.update(response)
                    result['is_success'] = True
                    break

            except Exception as error:
                result['internal_errors'].append(error)

            time.sleep(5.0)

        return result, token

    def get_token(self, code=None, refresh_token=None):
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

        response = requests.get(url, params=params).json()
        token_result['access_token'] = response['access_token']
        token_result['refresh_token'] = response['refresh_token']

        if code:
            token_result['tokenExpiration'] = response['expires_in']

        return token_result


class GeniOAuthError(Exception):
    """Custom exception raised when session expires and we need to renew"""
    def __init__(self, value):
        super(GeniOAuthError, self).__init__(value)
        self.value = value

    def __str__(self):
        return repr(self.value)

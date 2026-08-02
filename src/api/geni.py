import asyncio
import os, time
import requests
import aiohttp
import logging
from collections import deque
from sanic.log import logger as sanic_logger


class RateLimiter:
    """Async token-bucket limiter: at most `calls` requests per `period` seconds.

    Geni's API silently degrades (slow or failing responses) when hit with a
    burst of concurrent requests. The old sync client (src/old/geni_client.py)
    throttled every call to 1/sec via @limits(calls=1, period=1) and used a
    20s request timeout, and never stalled. This async port dropped both
    (see the old "# TODO: limit call rate" below) while also raising
    concurrency a lot (asyncio.gather over a whole batch, across several
    worker queues) - so bursts of concurrent Geni calls go out unthrottled.
    When Geni then errors or hangs, PathManager treats it as "pending" and
    retries for PENDING_TIMEOUT (30s) before giving up and recording a
    profile as unconnected even though a real path may exist - which shows
    up as the search finishing early with some profiles simply missing.
    """
    def __init__(self, calls: int, period: float):
        self.calls = calls
        self.period = period
        self._timestamps = deque()
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            while True:
                now = time.monotonic()
                while self._timestamps and now - self._timestamps[0] > self.period:
                    self._timestamps.popleft()
                if len(self._timestamps) < self.calls:
                    self._timestamps.append(now)
                    return
                await asyncio.sleep(self.period - (now - self._timestamps[0]))


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
    PROFILE_SEARCH_URL = 'api/profile/search'

    # This client's own self-throttle - a backstop against runaway bursts,
    # NOT an attempt to match whatever Geni enforces server-side (we can't
    # see that from here, and it may differ per registered Geni app/client
    # ID). Started at 25/10s from an old TODO comment, but a side-by-side
    # comparison against geni.anumuseum.org.il (same codebase) sustained
    # ~17 profiles/sec without errors, so 25/10s (2.5/sec) was almost
    # certainly us throttling ourselves well below what Geni allows. Set
    # generously above the observed comparison; if Geni has a lower quota
    # for THIS app's client ID specifically, we'll now see real rejections
    # from Geni in the logs (see _geni_api_call) instead of just being slow.
    RATE_LIMIT_CALLS = int(os.environ.get('GENI_RATE_LIMIT_CALLS', 200))
    RATE_LIMIT_PERIOD = float(os.environ.get('GENI_RATE_LIMIT_PERIOD', 10))
    HTTP_TIMEOUT_SECONDS = float(os.environ.get('GENI_HTTP_TIMEOUT', 20))

    def __init__(self):
        self.session = requests.session()
        self._rate_limiter = RateLimiter(self.RATE_LIMIT_CALLS, self.RATE_LIMIT_PERIOD)
        self._http_timeout = aiohttp.ClientTimeout(total=self.HTTP_TIMEOUT_SECONDS)

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
            'guid',
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
        if part_profiles['is_success']:
            profiles += part_profiles['results']
        for p in profiles:
            p['id'] = f"profile-g{p['guid']}"
        return profiles, next_page_url, part_profiles.get('total_count')

    async def search_profiles(self, token, names, page=1):
        """Search Geni profiles by name. Returns (results, token)."""
        from urllib.parse import quote
        url = f"{self.BASE_URL}{self.PROFILE_SEARCH_URL}?names={quote(names)}&page={page}"
        raw, token = await self._geni_api_call(url, token)
        results = raw.get('results', []) if raw.get('is_success') else []
        out = []
        for p in results:
            guid = str(p.get('guid', '') or '')
            if not guid:
                continue
            out.append({'guid': guid, 'name': p.get('name', f'profile {guid}')})
        return out, token

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
        if 'guid' in profile_raw:
            profile_raw['id'] = f"profile-g{profile_raw['guid']}"
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

    async def _geni_api_call(self, url, token, fields=None):
        result = {
            'api_errors': [],
            'internal_errors': [],
            'is_success': False
        }

        payload = {'access_token': token} if token else dict()
        if fields is not None:
            payload['fields'] = ','.join(fields)

        # Throttle before every call - see RateLimiter docstring for why.
        await self._rate_limiter.acquire()

        try:
            #response_raw = self.session.get(url, params=payload, timeout=20)
            #print(f'querying {url} {payload}')
            logging.debug(f"Geni API call: {url} {payload}")
            async with aiohttp.ClientSession(timeout=self._http_timeout) as session:
                async with session.get(url, params=payload) as response_raw:
                    response = await response_raw.json()

            if response.get('error'):
                result['api_errors'].append(response['error'])
                # Logged at WARNING (not DEBUG, which is silent by default in
                # production) so an actual Geni-side rejection - e.g. a
                # per-app rate limit distinct from our own client-side
                # throttle above - is visible in `heroku logs --tail`
                # instead of just showing up as a slow/incomplete search.
                sanic_logger.warning(f"Geni API error for {url}: {response['error']} (status={response_raw.status})")

                if response['error']['type'] == 'OAuthException':
                    await self._get_token(token['refresh_token'])

            elif (
                response_raw.status == 200
                or response_raw.status == 403
            ):
                result.update(response)
                result['is_success'] = True

        except Exception as error:
            # Includes asyncio.TimeoutError from the timeout above - previously
            # requests could hang indefinitely here with no timeout at all.
            result['internal_errors'].append(error)
            sanic_logger.warning(f"Geni API call failed: {url} -> {error!r}")

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
        async with aiohttp.ClientSession(timeout=self._http_timeout) as session:
            async with session.get(url, params=params) as response_raw:
                response = await response_raw.json()
        token_result['access_token'] = response['access_token']
        token_result['refresh_token'] = response['refresh_token']

        if code:
            token_result['tokenExpiration'] = response['expires_in']

        return token_result

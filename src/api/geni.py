import asyncio
import datetime
import os, time
import requests
import aiohttp
import logging
from collections import deque
from sanic.log import logger as sanic_logger


def _int_header(headers, name):
    """Read an integer header, returning None if absent/unparseable."""
    try:
        raw = headers.get(name)
        if raw is None:
            # Plain dicts (unlike aiohttp's CIMultiDict) are case-sensitive.
            lowered = name.lower()
            for k, v in headers.items():
                if k.lower() == lowered:
                    raw = v
                    break
    except Exception:
        return None
    if raw is None:
        return None
    try:
        return int(str(raw).strip())
    except (TypeError, ValueError):
        return None


class GeniRateLimiter:
    """Token bucket that CALIBRATES ITSELF from Geni's own rate-limit headers.

    Why this exists
    ---------------
    Geni returns three headers on every API response:

        X-API-Rate-Limit      max requests allowed within a rate window
        X-API-Rate-Remaining  requests left in the current window (0 => denied)
        X-API-Rate-Window     window duration, in seconds

    and the docs explicitly say "Rate limits are subject to change without
    notice". So ANY number hardcoded on our side is a guess that goes stale,
    and guessing too high is actively harmful: once X-API-Rate-Remaining hits
    0, Geni denies every further request in that window. Those denials came
    back as `is_success == False`, which PathManager read as "pending", which
    triggered an immediate re-poll, which consumed more of the next window's
    quota... i.e. a death spiral where the harder we push, the less real work
    gets done. That is the "runs forever / never finishes / profiles missing"
    behaviour.

    So: start from a deliberately conservative guess, then adopt whatever Geni
    actually advertises as soon as the first response comes back, and sit out
    the rest of the window whenever Geni tells us we are out of quota. We never
    spend quota on a request Geni has already said it will refuse.
    """

    def __init__(self, calls: int, period: float, safety: float = 0.85, shards: int = 1):
        self.shards = max(1, int(shards or 1))
        self.safety = safety
        self._advertised = None            # (limit, window) exactly as Geni reported
        self.calls = max(1, int(calls / self.shards))
        self.period = float(period)
        self.calibrated = False
        self._timestamps = deque()
        self._lock = asyncio.Lock()
        self._cooloff_until = 0.0
        self._cooloff_reason = ''
        self._denied = 0                   # times we were told to back off
        self._sent = 0
        # Wall-clock record of every time Geni said we were out of quota. Geni
        # support asks for the exact date/time of a rate-limit event so they can
        # match it against their own logs, so keep the last few with timestamps
        # rather than making someone grep dyno logs for them.
        self._events = deque(maxlen=50)

    # -- issuing side -----------------------------------------------------

    async def acquire(self):
        """Block until it is our turn to make a request."""
        while True:
            async with self._lock:
                now = time.monotonic()
                if now >= self._cooloff_until:
                    while self._timestamps and now - self._timestamps[0] >= self.period:
                        self._timestamps.popleft()
                    if len(self._timestamps) < self.calls:
                        self._timestamps.append(now)
                        self._sent += 1
                        return
                    wait = self.period - (now - self._timestamps[0])
                else:
                    wait = self._cooloff_until - now
            # Sleep OUTSIDE the lock, so a global cool-off does not pin the lock
            # for every other coroutine; each waiter re-checks under the lock.
            await asyncio.sleep(min(max(wait, 0.02), 30.0))

    # -- feedback side ----------------------------------------------------

    def observe(self, headers):
        """Re-tune from a live response's rate-limit headers."""
        limit = _int_header(headers, 'X-API-Rate-Limit')
        remaining = _int_header(headers, 'X-API-Rate-Remaining')
        window = _int_header(headers, 'X-API-Rate-Window')

        if limit and window and limit > 0 and window > 0:
            if self._advertised != (limit, window):
                self._advertised = (limit, window)
                # Leave headroom: requests already in flight when a window rolls
                # over would otherwise tip us just over the edge. Divide by the
                # number of processes sharing the quota (see GENI_RATE_LIMIT_SHARDS).
                self.calls = max(1, int(limit * self.safety / self.shards))
                self.period = float(window)
                self.calibrated = True
                self._timestamps.clear()
                sanic_logger.info(
                    f"Geni rate limit calibrated from headers: Geni allows {limit}/{window}s; "
                    f"this process will use {self.calls}/{self.period}s "
                    f"(safety={self.safety}, shards={self.shards})")

        if remaining is not None and remaining <= 0:
            self.back_off(self.period, 'X-API-Rate-Remaining=0')

    def back_off(self, seconds: float, reason: str = ''):
        """Globally pause all Geni traffic for `seconds` (idempotent-ish)."""
        seconds = max(0.5, min(float(seconds or 0), 120.0))
        until = time.monotonic() + seconds
        if until > self._cooloff_until:
            self._cooloff_until = until
            self._cooloff_reason = reason
            self._denied += 1
            stamp = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
            self._events.append({'at_utc': stamp, 'reason': reason,
                                 'paused_seconds': round(seconds, 1)})
            sanic_logger.warning(
                f"GENI RATE LIMIT HIT at {stamp} ({reason}) - "
                f"pausing all Geni calls for {seconds:.1f}s")

    def stats(self):
        now = time.monotonic()
        return {
            'calibrated_from_headers': self.calibrated,
            'geni_advertised': (
                {'limit': self._advertised[0], 'window_seconds': self._advertised[1]}
                if self._advertised else None),
            'effective_calls_per_window': self.calls,
            'effective_window_seconds': self.period,
            'effective_rate_per_second': round(self.calls / self.period, 2) if self.period else None,
            'safety_factor': self.safety,
            'shards': self.shards,
            'requests_sent': self._sent,
            'backoffs': self._denied,
            'cooling_off_for_seconds': round(max(0.0, self._cooloff_until - now), 1),
            'cooloff_reason': self._cooloff_reason,
            # Hand these timestamps straight to Geni support when they ask
            # "when exactly were you rate-limited?".
            'rate_limit_events_utc': list(self._events),
        }


# Back-compat alias: older code/imports referred to this as RateLimiter.
RateLimiter = GeniRateLimiter


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

    # Pre-calibration guess only. The real value is taken from Geni's
    # X-API-Rate-* response headers on the very first call (see GeniRateLimiter),
    # so this number only governs the handful of requests before that happens.
    # Deliberately conservative: overshooting costs far more than undershooting,
    # because every denied request also triggers a re-poll.
    RATE_LIMIT_CALLS = int(os.environ.get('GENI_RATE_LIMIT_CALLS', 50))
    RATE_LIMIT_PERIOD = float(os.environ.get('GENI_RATE_LIMIT_PERIOD', 10))
    # Fraction of Geni's advertised limit we actually use.
    RATE_LIMIT_SAFETY = float(os.environ.get('GENI_RATE_LIMIT_SAFETY', 0.85))
    # Geni's quota is per application, not per process. If this app is ever run
    # with more than one Sanic worker PROCESS, each has its own limiter, so tell
    # them how many ways to split the quota.
    RATE_LIMIT_SHARDS = int(os.environ.get('GENI_RATE_LIMIT_SHARDS',
                                           os.environ.get('WORKER_QUANTITY', 1)))
    HTTP_TIMEOUT_SECONDS = float(os.environ.get('GENI_HTTP_TIMEOUT', 20))
    # Ceiling on simultaneously open sockets to geni.com.
    HTTP_CONN_LIMIT = int(os.environ.get('GENI_HTTP_CONN_LIMIT', 32))

    # path-to `status` values that mean "no answer yet, ask again later"
    # rather than "definitively no relation". See
    # https://www.geni.com/platform/developer/help/api?path=profile%2Fpath-to
    RETRYABLE_STATUSES = ('pending', 'overloaded')

    def __init__(self):
        self.session = requests.session()
        self._rate_limiter = GeniRateLimiter(self.RATE_LIMIT_CALLS,
                                             self.RATE_LIMIT_PERIOD,
                                             safety=self.RATE_LIMIT_SAFETY,
                                             shards=self.RATE_LIMIT_SHARDS)
        self._http_timeout = aiohttp.ClientTimeout(total=self.HTTP_TIMEOUT_SECONDS)
        self._http_session = None
        self._http_session_lock = asyncio.Lock()

    @property
    def rate_limiter(self):
        return self._rate_limiter

    def rate_stats(self):
        return self._rate_limiter.stats()

    async def _get_http_session(self):
        """One shared aiohttp session for the whole process.

        Previously every single Geni call opened (and immediately tore down) its
        own ClientSession, i.e. a fresh DNS lookup + TCP + TLS handshake per
        request. At a few requests a second across thousands of profiles that is
        both slow and a good way to pile up half-closed sockets on a Heroku dyno.
        """
        if self._http_session is not None and not self._http_session.closed:
            return self._http_session
        async with self._http_session_lock:
            if self._http_session is None or self._http_session.closed:
                connector = aiohttp.TCPConnector(limit=self.HTTP_CONN_LIMIT,
                                                 ttl_dns_cache=300,
                                                 enable_cleanup_closed=True)
                self._http_session = aiohttp.ClientSession(timeout=self._http_timeout,
                                                           connector=connector)
        return self._http_session

    async def close(self):
        if self._http_session is not None and not self._http_session.closed:
            await self._http_session.close()
            self._http_session = None

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

        # 'overloaded' is Geni telling us its path engine is saturated. It
        # arrives as a perfectly successful HTTP 200, so without this it looked
        # like a completed search that found no relation, and the profile got
        # permanently written off as unconnected. Flag it as retryable AND ease
        # off globally, since it is a whole-service signal, not a per-profile one.
        if status.get('status') in self.RETRYABLE_STATUSES:
            status['retryable'] = True
            if status.get('status') == 'overloaded':
                self._rate_limiter.back_off(self._rate_limiter.period,
                                            "path-to status=overloaded")

        return status, token

    async def get_batch_path_to(self, task_list):
        requests = []
        for task in task_list:
            requests.append(self.get_path_to(task.data['source_id'],
                                             task.data['target_id'],
                                             task.data['token']))
        status_list = await asyncio.gather(*requests)
        return status_list

    async def _call_with_retry(self, url, token, fields=None, attempts=5, what='geni call'):
        """Retry a call while Geni says the failure is transient.

        The old loop here was `5 tries, 0.25s apart` - which is no help at all
        against a rate-limit window measured in seconds. When it gave up it
        returned an empty result, and for project paging that silently truncated
        the project (the run then "finished" having never looked at the rest of
        the profiles). Now the waits are exponential and the rate limiter's own
        cool-off does most of the work.
        """
        delay = 1.0
        result = {'is_success': False, 'api_errors': [], 'internal_errors': []}
        for attempt in range(1, attempts + 1):
            result, token = await self._geni_api_call(url, token, fields)
            if result['is_success']:
                return result, token
            if not result.get('retryable'):
                break
            if attempt < attempts:
                sanic_logger.warning(
                    f"{what}: transient failure (attempt {attempt}/{attempts}), "
                    f"retrying in {delay:.1f}s - {result.get('api_errors') or result.get('internal_errors')}")
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30.0)
        if not result['is_success']:
            sanic_logger.error(
                f"{what}: giving up after {attempts} attempts - "
                f"{result.get('api_errors') or result.get('internal_errors')}")
        return result, token

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
        part_profiles, token = await self._call_with_retry(
            url, token, fields, attempts=6, what=f"project profiles page ({project_id})")

        next_page_url = part_profiles.get('next_page')
        if part_profiles['is_success']:
            profiles += part_profiles['results']
        else:
            # Be loud: this is the failure mode that makes a run look "complete"
            # while quietly having skipped part (or all) of the project.
            sanic_logger.error(
                f"Could not list project profiles at {url} - the project listing is "
                f"TRUNCATED, results will be incomplete.")
        kept = []
        for p in profiles:
            guid = p.get('guid')
            if not guid:
                sanic_logger.warning(f"Skipping project profile with no guid: {p.get('name')}")
                continue
            p['id'] = f"profile-g{guid}"
            kept.append(p)
        return kept, next_page_url, part_profiles.get('total_count')

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

        profile_raw, token = await self._call_with_retry(
            url, token, fields, attempts=5, what=f"profile details ({profile_id})")

        if 'guid' in profile_raw:
            profile_raw['id'] = f"profile-g{profile_raw['guid']}"
        return profile_raw, token

    async def get_project_details(self, token, project_id=None, fields=None):
        if not project_id: project_id = "project"
        """Get the project details."""
        url = self.BASE_URL + self.PROJECT_URL.format(project=project_id)

        project_raw, token = await self._call_with_retry(
            url, token, fields, attempts=5, what=f"project details ({project_id})")

        return project_raw, token

    async def _geni_api_call(self, url, token, fields=None):
        result = {
            'api_errors': [],
            'internal_errors': [],
            'is_success': False,
            'retryable': False,
        }

        payload = {'access_token': token} if token else dict()
        if fields is not None:
            payload['fields'] = ','.join(fields)

        # Throttle before every call - see GeniRateLimiter for why.
        await self._rate_limiter.acquire()

        try:
            logging.debug(f"Geni API call: {url} {payload}")
            session = await self._get_http_session()
            async with session.get(url, params=payload) as response_raw:
                http_status = response_raw.status
                resp_headers = dict(response_raw.headers)
                # Feed Geni's own numbers back into the limiter BEFORE we look at
                # the body: this is where the effective rate is actually decided.
                self._rate_limiter.observe(response_raw.headers)
                # content_type=None: Geni serves an HTML error page for some
                # failures, and a strict json() would raise ContentTypeError,
                # which used to surface as an opaque "internal error".
                try:
                    response = await response_raw.json(content_type=None)
                except Exception:
                    response = None
                if not isinstance(response, dict):
                    body = (await response_raw.text())[:200] if response is None else str(response)[:200]
                    result['internal_errors'].append(f"non-JSON response (HTTP {http_status})")
                    result['retryable'] = http_status == 429 or http_status >= 500
                    sanic_logger.warning(
                        f"Geni non-JSON response for {url}: HTTP {http_status}: {body!r}")
                    return result, token

            result['http_status'] = http_status

            if http_status == 429:
                retry_after = _int_header(resp_headers, 'Retry-After')
                self._rate_limiter.back_off(retry_after or self._rate_limiter.period,
                                            'HTTP 429')
                result['retryable'] = True
                result['api_errors'].append(response.get('error') or 'rate limited')
                sanic_logger.warning(f"Geni rate limited (429) for {url}")
                return result, token

            if response.get('error'):
                error = response['error']
                result['api_errors'].append(error)
                # Logged at WARNING (not DEBUG, which is silent by default in
                # production) so an actual Geni-side rejection is visible in
                # `heroku logs --tail` instead of just showing up as a slow or
                # incomplete search.
                sanic_logger.warning(
                    f"Geni API error for {url}: {error} (status={http_status})")

                message = str(error).lower()
                if ('rate' in message and 'limit' in message) or 'too many' in message \
                        or 'exceed' in message:
                    self._rate_limiter.back_off(self._rate_limiter.period,
                                                'API error mentions rate limit')
                    result['retryable'] = True
                elif http_status >= 500 or http_status == 429:
                    result['retryable'] = True

                if isinstance(error, dict) and error.get('type') == 'OAuthException':
                    # `token` here is the access-token STRING, not a dict; the old
                    # token['refresh_token'] raised TypeError and got swallowed.
                    result['retryable'] = False
                    sanic_logger.warning(
                        "Geni OAuthException - the access token is no longer valid; "
                        "the client needs to re-authorise.")

            elif (
                http_status == 200
                or http_status == 403
            ):
                result.update(response)
                result['is_success'] = True
                result['retryable'] = response.get('status') in self.RETRYABLE_STATUSES
            else:
                result['internal_errors'].append(f"unexpected HTTP {http_status}")
                result['retryable'] = http_status >= 500
                sanic_logger.warning(f"Geni unexpected HTTP {http_status} for {url}")

        except asyncio.CancelledError:
            raise
        except Exception as error:
            # Includes asyncio.TimeoutError from the client timeout, and
            # connection resets - all of which are worth another try.
            result['internal_errors'].append(repr(error))
            result['retryable'] = True
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

        session = await self._get_http_session()
        async with session.get(url, params=params) as response_raw:
            self._rate_limiter.observe(response_raw.headers)
            response = await response_raw.json(content_type=None)
        token_result['access_token'] = response['access_token']
        token_result['refresh_token'] = response['refresh_token']

        if code:
            token_result['tokenExpiration'] = response['expires_in']

        return token_result

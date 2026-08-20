import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
import datetime

from dotenv import load_dotenv

from sanic import Sanic, response
import logging
from sanic.log import logger
from sanic.response import text
from sanic.response import json as sanic_json
from sanic.request import Request
from sanic.views import HTTPMethodView
from sanic.exceptions import SanicException, NotFound
from collections import defaultdict
from databases import Database
from sqlalchemy import create_engine, and_

from multiprocessing import cpu_count
import asyncio
from asyncio import PriorityQueue, Queue

from api.utils import Timer
timer = Timer("main", logging.DEBUG)
import random

logger.setLevel(logging.INFO)


def abort(status_code, message=''):
    """Shim for the removed sanic.exceptions.abort helper."""
    raise SanicException(message or 'Error', status_code=status_code)


def json(data, **kwargs):
    """Shim: modern sanic json() dropped escape_forward_slashes."""
    kwargs.pop('escape_forward_slashes', None)
    return sanic_json(data, **kwargs)


app = Sanic('api')

# Load parameters
load_dotenv()
app.config['ACCESS_LOG'] = False

from api.utils import Utils
from api.models import metadata, paths_table, profiles_table, preset_projects_table
if os.getenv("GENI_MOCK"):
    from api.mock.geni import GeniClientAsync
else:
    from api.geni import GeniClientAsync
from api.path import PathManager, Task, PATH_FIND_BATCH, cancel_pending_requeues
from api.profile import ProfileManager


def normalize_db_url(url, driver):
    """Force an explicit driver on a mysql:// URL (SQLAlchemy 2 needs one)."""
    if url.startswith('mysql://'):
        return url.replace('mysql://', f'mysql+{driver}://', 1)
    return url


# Initialize database. SQLALCHEMY_DATABASE_URI is the primary source;
# fall back to Heroku's JAWSDB_URL if it's not set.
raw_db_url = os.getenv("SQLALCHEMY_DATABASE_URI") or os.getenv("JAWSDB_URL") or ""
db_url = normalize_db_url(raw_db_url, 'aiomysql')          # async access (databases lib)
sync_db_url = normalize_db_url(raw_db_url, 'pymysql')      # one-time table creation

try:
    engine = create_engine(sync_db_url, echo=False)
    metadata.create_all(engine)
except Exception as _e:
    logger.error(f"metadata.create_all failed at boot (continuing): {_e}")

database = Database(db_url)

geni = GeniClientAsync()

bp_profiles = Utils.create_blueprint("profiles")
bp_paths = Utils.create_blueprint("paths")
bp_projects = Utils.create_blueprint("projects")
bp_debug = Utils.create_blueprint("debug")
bp_admin = Utils.create_blueprint("admin")

TOKEN_PARAM = 'authorization'

class Token:
    cache = dict()
    cache_valid_seconds = 300

    @staticmethod
    async def validate(token):
        if token in Token.cache and (datetime.datetime.now() - Token.cache[token]) < datetime.timedelta(seconds=Token.cache_valid_seconds):
            return token
        if not token or not await geni.validate_token(token):
            # clear from cache
            logger.debug(f"Token: {token} is invalid")
            Token.cache.pop(token, None)
            abort(400, "Invalid access token")
        # put into the cache
        Token.cache[token] = datetime.datetime.now()
        return token

class ProfileView(HTTPMethodView):
    PERSONALITIES = []

    @staticmethod
    async def load_personalities():
        if not ProfileView.PERSONALITIES:
            ProfileView.PERSONALITIES = await ProfileManager(database, geni, None).load_personalities()
            logger.info(f"Pre-loading personalities from DB: {len(ProfileView.PERSONALITIES)}")

    @bp_profiles.get("/cache")
    async def post(self, request: Request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        num_profiles = await ProfileManager(database, geni, token).cache_personalities()
        return json(num_profiles)

    async def get(self, request: Request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        profile_id = request.args.get('id')
        if not profile_id:
            abort(403, "Profile id is missing")
        profile = await ProfileManager(database, geni, token).get(profile_id)
        output = {"profile":  dict(profile) if profile else dict()}
        return json(output)

    @staticmethod
    @bp_profiles.get("/count")
    async def get_count(request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        # Count personalities from cache
        count = await ProfileManager(database, geni, token).count(request.args.get('target_id'))

        return json({"count": count})

    @staticmethod
    @bp_profiles.get("/search")
    async def search_geni_profiles(request):
        """Proxy Geni profile-name search for the picker UI (CORS-safe)."""
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        names = (request.args.get('names') or '').strip()
        page = request.args.get('page', 1)
        if not names:
            return json({'results': []})
        results, _tok = await geni.search_profiles(token, names, page)
        return json({'results': results[:20]})

    @staticmethod
    @bp_profiles.get("/geni")
    async def get_geni_profiles(request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        ids = request.args.getlist("ids")
        fields = request.args.get('fields', '')
        ids = [id.replace('profile-', '') for id in ids]

        if ids:
            resp, token = await geni.get_profile_details(
                token,
                f'profile?ids={",".join(ids)}',
                fields.split(',') if fields else None
            )
        else:
            pm = ProfileManager(database, geni, token)
            my_profile = await pm.cache()
            # First, save/update current user's profile
            await pm.save(my_profile, is_user=True)
            resp = my_profile

        if 'is_success' in resp and resp['is_success']:
            del resp['api_errors']
            del resp['internal_errors']
            del resp['is_success']

        return json(
            {'results': [resp]}
            if 'results' not in resp
            else resp
        )

def dt_converter(o):
    if isinstance(o, datetime.datetime):
        return o.__str__()
    return o

class ProjectView(HTTPMethodView):
    async def get(self, request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        id = request.args.get('id')
        if not id:
            abort(403, "Project id is missing")
        project_response = await geni.get_project_details(token, id)
        return json({"project": project_response[0]})


# ---------------- Preset target projects (editable via /admin) ----------------

# The list that used to be hardcoded in the Angular picker; used to seed the
# preset_projects table the first time the app boots against an empty table.
DEFAULT_PRESETS = [
    ("project-10373", "Nobel Prize in Physics"),
    ("project-5272",  "Nobel Prize in Literature"),
    ("project-5571",  "Nobel Prize in Chemistry"),
    ("project-8020",  "Nobel Peace Prize"),
    ("project-7284",  "Nobel Prize in Physiology or Medicine"),
    ("project-10374", "Nobel Prize in Economics"),
    ("project-8",     "Mayflower Passengers of 1620"),
    ("project-3232",  "British Monarchs"),
    ("project-358",   "Partial Hollywood Walk of Fame"),
    ("project-9",     "US Presidents and Vice Presidents"),
    ("project-10700", "Titanic Passengers - First Class"),
    ("project-10701", "Titanic Passengers - Second Class"),
    ("project-10702", "Titanic Passengers - Third Class"),
    ("project-10704", "Titanic Deck Crew"),
]

async def seed_presets_if_empty():
    row = await database.fetch_one(preset_projects_table.select().limit(1))
    if row is None:
        for i, (pid, label) in enumerate(DEFAULT_PRESETS):
            await database.execute(preset_projects_table.insert().values(
                id=pid, label=label, sort_order=i, enabled=True))
        logger.info(f"Seeded {len(DEFAULT_PRESETS)} preset projects")

@bp_projects.get("/search")
async def user_project_search(request):
    """Project search by name for the picker UI (any logged-in user)."""
    await Token.validate(request.headers.get(TOKEN_PARAM))
    q = (request.args.get('q') or '').strip()
    configured, results = await google_project_search(q)
    return json({"configured": configured, "results": results,
                 "cse_id": os.getenv('GOOGLE_CSE_ID', '')})

@bp_projects.get("/presets")
async def get_presets(request):
    """Public list of preset target projects for the picker UI."""
    query = preset_projects_table.select().where(
        preset_projects_table.c.enabled == True).order_by(
        preset_projects_table.c.sort_order)
    rows = await database.fetch_all(query)
    return json({"presets": [{"id": r["id"], "label": r["label"]} for r in rows]})



# ---- Google Programmable Search for Geni projects (shared, cached) ----
PROJECT_SEARCH_CACHE = {}          # query -> (timestamp, results)
PROJECT_SEARCH_CACHE_TTL = 7 * 24 * 3600
PROJECT_SEARCH_CACHE_MAX = 500

async def google_project_search(q):
    """Search Geni projects by name via Google Programmable Search.
    Returns (configured, results). Results cached to conserve API quota."""
    cse_key = os.getenv('GOOGLE_CSE_KEY')
    cse_id = os.getenv('GOOGLE_CSE_ID')
    if not cse_key or not cse_id:
        return False, []
    if not q:
        return True, []
    key = q.lower()
    now = datetime.datetime.now().timestamp()
    hit = PROJECT_SEARCH_CACHE.get(key)
    if hit and now - hit[0] < PROJECT_SEARCH_CACHE_TTL:
        return True, hit[1]
    import aiohttp, re
    url = 'https://www.googleapis.com/customsearch/v1'
    params = {'key': cse_key, 'cx': cse_id,
              'q': f'site:geni.com/projects {q}', 'num': 10}
    results = []
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as resp:
                data = await resp.json()
        for item in (data.get('items') or []):
            link = item.get('link', '')
            m = re.search(r'geni\.com/projects/[^/]+/(\d+)', link)
            if not m:
                continue
            title = re.sub(r'\s*[-|]\s*geni(\.com)?.*$', '', item.get('title', ''), flags=re.I).strip()
            results.append({'project_id': f'project-{m.group(1)}',
                            'title': title or f'project-{m.group(1)}',
                            'link': link})
    except Exception:
        logger.exception('google_project_search error:')
        return True, []
    seen = set()
    results = [r for r in results if not (r['project_id'] in seen or seen.add(r['project_id']))]
    if len(PROJECT_SEARCH_CACHE) >= PROJECT_SEARCH_CACHE_MAX:
        PROJECT_SEARCH_CACHE.clear()
    PROJECT_SEARCH_CACHE[key] = (now, results)
    return True, results

def require_admin(request):
    admin_key = os.getenv('ADMIN_KEY')
    if not admin_key:
        abort(403, "Admin interface is not configured (ADMIN_KEY not set)")
    if request.headers.get('X-Admin-Key') != admin_key:
        abort(403, "Bad admin key")

@bp_admin.get("/presets")
async def admin_list_presets(request):
    require_admin(request)
    query = preset_projects_table.select().order_by(preset_projects_table.c.sort_order)
    rows = await database.fetch_all(query)
    return json({"presets": [dict(r) for r in rows]})

@bp_admin.post("/presets")
async def admin_save_preset(request):
    """Insert or update a preset. Body: {id, label, sort_order?, enabled?}"""
    require_admin(request)
    body = request.json or {}
    pid = str(body.get('id', '')).strip()
    label = str(body.get('label', '')).strip()
    if not pid.startswith('project-') or not pid.replace('project-', '').isdigit():
        abort(400, "id must look like project-12345")
    if not label:
        abort(400, "label is required")
    values = {'id': pid, 'label': label,
              'sort_order': int(body.get('sort_order', 999)),
              'enabled': bool(body.get('enabled', True))}
    existing = await database.fetch_one(
        preset_projects_table.select().where(preset_projects_table.c.id == pid))
    if existing is None:
        await database.execute(preset_projects_table.insert().values(values))
    else:
        await database.execute(preset_projects_table.update().where(
            preset_projects_table.c.id == pid).values(values))
    return json({"saved": values})

@bp_admin.get("/project-search")
async def admin_project_search(request):
    """Search Geni projects by name (admin panel)."""
    require_admin(request)
    q = (request.args.get('q') or '').strip()
    configured, results = await google_project_search(q)
    return json({"configured": configured, "results": results,
                 "cse_id": os.getenv('GOOGLE_CSE_ID', '')})

@bp_admin.get("/geni-rate")
async def admin_geni_rate(request):
    """What rate limit is Geni ACTUALLY giving us right now?

    The client no longer guesses: it reads X-API-Rate-Limit / X-API-Rate-Window
    off Geni's responses and throttles to that. This endpoint shows what it
    found, plus queue depth, so a slow run can be diagnosed as "Geni's quota is
    small" vs "we are stuck on something else" without reading dyno logs.
    """
    require_admin(request)
    stats = geni.rate_stats() if hasattr(geni, 'rate_stats') else {}
    try:
        stats['queue_sizes'] = [q.qsize() for q in app.ctx.task_queue]
    except Exception:
        stats['queue_sizes'] = []
    from api.path import PENDING_TIMEOUT, PENDING_BACKOFF_BASE, PENDING_BACKOFF_MAX, PATH_FIND_BATCH as _b
    stats['pending_timeout_seconds'] = PENDING_TIMEOUT
    stats['pending_backoff_base_seconds'] = PENDING_BACKOFF_BASE
    stats['pending_backoff_max_seconds'] = PENDING_BACKOFF_MAX
    stats['path_find_batch'] = _b
    return json(stats)


@bp_admin.get("/run-status")
async def admin_run_status(request):
    """Did the last run actually finish, and if not, what is left?

    'connected'     - a path was found
    'no_path_found' - Geni searched and answered "not found". This is a real
                      answer, not a failure; for a project of notable people
                      most of the list often lands here.
    'gave_up'       - we stopped asking before Geni answered. THESE are the
                      ones worth re-running; starting a new search retries
                      exactly this set.
    """
    require_admin(request)
    source_id = request.args.get('source_id')
    if not source_id:
        pm = ProfileManager(database, geni, None)
        abort(400, "source_id is required (e.g. profile-g6000000002764082210)")
    summary = await PathManager(database, geni, None).outcome_summary(source_id)
    try:
        summary['queued_batches'] = sum(q.qsize() for q in app.ctx.task_queue)
    except Exception:
        summary['queued_batches'] = None
    summary['still_working'] = bool(summary.get('queued_batches'))
    return json(summary)


@bp_admin.delete("/presets/<preset_id>")
async def admin_delete_preset(request, preset_id):
    require_admin(request)
    await database.execute(preset_projects_table.delete().where(
        preset_projects_table.c.id == preset_id))
    return json({"deleted": preset_id})


class PathView(HTTPMethodView):

    async def get(self, request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        source_id = request.args.get('source_id')
        target_id = request.args.get('target_id')
        if not source_id or not target_id:
            abort(403, "Source and/or target profile id is missing")

        path = await PathManager(database, geni, token).get(source_id, target_id)
        path = {k:dt_converter(v) for k,v in dict(path).items()}
        return json({"path": path}, escape_forward_slashes=False)

    @staticmethod
    @bp_paths.post("/personalities")
    async def post_search_personalities(request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        source_id = request.json.get('source_id')
        target_id = request.json.get('target_id')
        if not target_id:
            abort(401, "Target id (profile or project) is mandatory")
        do_reset = request.json.get('reset')
        if do_reset:
            await PathView._reset_connections(token, source_id)

        enqueue_task = asyncio.create_task(
            PathView._post_search_personalities(token, source_id, target_id))
        try:
            tasks = [t for t in getattr(app.ctx, 'enqueue_tasks', []) if t and not t.done()]
            tasks.append(enqueue_task)
            app.ctx.enqueue_tasks = tasks
        except Exception as e:
            logger.warning(f"Could not track enqueue task: {e}")
        logger.info(f"Started personalities paths search, source: {source_id}, target: {target_id}")
        return json({"status": "Started personalities paths search"})

    @staticmethod
    @bp_paths.delete("/personalities")
    async def delete_search_personalities(request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        source_id = request.args.get('source_id')

        await PathView._reset_connections(token, source_id)
        return json({"status": "Deleted personalities paths"})

    @staticmethod
    async def _reset_connections(token, source_id):
        pm = ProfileManager(database, geni, token)
        path_mgr = PathManager(database, geni, token)
        if not source_id:
            my_profile = await pm.cache()
            source_id = my_profile['id']
        await path_mgr.clear_paths(source_id)

        # A new search must not keep populating results for the previous target.
        # 1) Cancel any still-running enqueuer from the old target.
        # 2) Drain path-finding tasks that were already queued but not yet run.
        # Both are wrapped defensively so a hiccup here never breaks the reset.
        cancelled = 0
        try:
            for t in list(getattr(app.ctx, 'enqueue_tasks', []) or []):
                if t and not t.done():
                    t.cancel()
                    cancelled += 1
            app.ctx.enqueue_tasks = []
        except Exception as e:
            logger.warning(f"Enqueuer cancel skipped: {e}")

        # 3) Drop batches that are sitting out a retry backoff - otherwise they
        #    wake up after the drain below and re-fill the queues with the old
        #    target's work.
        backed_off = 0
        try:
            backed_off = cancel_pending_requeues()
        except Exception as e:
            logger.warning(f"Backoff cancel skipped: {e}")

        drained = 0
        try:
            for q in getattr(app.ctx, 'task_queue', []) or []:
                while True:
                    try:
                        q.get_nowait()
                        q.task_done()
                        drained += 1
                    except asyncio.QueueEmpty:
                        break
        except Exception as e:
            logger.warning(f"Queue drain skipped: {e}")

        logger.info(f"Deleted personalities paths search for : {source_id} "
                    f"(cancelled {cancelled} enqueuers, {backed_off} backed-off batches, "
                    f"drained {drained} queued task-batches)")

    @staticmethod
    async def _post_search_personalities(token, source_id, target_id):
        pm = ProfileManager(database, geni, token)
        path_mgr = PathManager(database, geni, token)

        # Cache source profile
        source_profile = await pm.cache(source_id)
        await pm.save(source_profile, False)
        # Iterate profiles either from given project or given single profile
        if target_id.startswith('profile'):
            async def single_profile_iter(target_id, iterate=True):
                yield ({'id': target_id}, 1)
            profile_iterator = single_profile_iter
        else:
            profile_iterator = pm.cache_personalities_geni

        batch = []
        count = 0
        max_priority = 2
        async for personality, profiles_count in profile_iterator(target_id, iterate=True):
            # Enqueue tasks for finding paths to all personalities
            max_priority = max(2, int(profiles_count / PATH_FIND_BATCH))
            src,tgt = source_profile['id'],personality['id']
            # Skip only profiles we have a real ANSWER for. Ones we previously
            # gave up on are retried, so re-running a search closes the gap
            # instead of permanently inheriting the first run's shortfall.
            existing = await path_mgr.get(src, tgt)
            if existing and not PathManager._gave_up(existing):
                logger.debug(f"Personality path {src} -> {tgt} already resolved - skipping")
                continue
            if existing:
                logger.info(f"Retrying previously-abandoned path {src} -> {tgt}")
            # Check validity of both src and target profiles
            profiles_valid = True
            for id in [src, tgt]:
                if not await pm.get(id):
                    logging.warning(f"Profile {id} doesn't exist - skipping")
                    profiles_valid = False
                    break
            if not profiles_valid: continue

            task_priority = random.randint(1, profiles_count)
            batch.append(Task({"source_id": src,
                      "target_id": tgt,
                      "is_user2user": False,
                      "pending_ts": None,  # the first time the path became pending
                      "is_retry": bool(existing),  # replace the abandoned row, don't duplicate it
                      "token": token},
                      task_priority))
            if len(batch) >= PATH_FIND_BATCH:
                q_index = PathView._choose_queue_index()
                await app.ctx.task_queue[q_index].put((random.randint(1, max_priority), batch))

                count += len(batch)
                logger.info(f"Added task to queue, count: {count} profiles, queue: {q_index}, queue size: {app.ctx.task_queue[q_index].qsize()}")
                batch = []
        # Last batch remainder
        if len(batch):
            q_index = PathView._choose_queue_index()
            await app.ctx.task_queue[q_index].put((random.randint(1, max_priority), batch))
            logger.info(f"Added to queue tasks of {count} profiles, queue: {q_index}, queue size: {app.ctx.task_queue[q_index].qsize()}")

    @staticmethod
    def _choose_queue_index():
        q_sizes = [q.qsize() for q in app.ctx.task_queue]
        min_q_index = q_sizes.index(min(q_sizes))
        logger.info(f"Choosing shortest queue among: {q_sizes}, chosen: {min_q_index}")
        return min_q_index

    @staticmethod
    @bp_paths.get("/personalities")
    async def get_personalities(request):
        return await PathView._get_paths(request, user2user=False)

    @staticmethod
    async def _get_paths(request, user2user):
        timer.start("PathView:get_paths")
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        offset = request.args.get('offset', 0)
        limit = request.args.get('limit', 50)
        source_id = request.args.get('source_id')

        pm = ProfileManager(database, geni, token)
        if not source_id:
            my_profile = await pm.cache()
            source_id = my_profile['id']
            logger.debug(my_profile)

        paths = await PathManager(database, geni, token).get_paths(source_id, offset, limit, user2user=user2user)
        timer.stop("PathView:get_paths")
        return json({"paths": [dict(p) for p in paths]}, escape_forward_slashes=False)

    @staticmethod
    @bp_paths.get("/personalities/count")
    async def get_personalities_count(request):
        return await PathView._count_paths(request, user2user=False)

    @staticmethod
    @bp_paths.get("/personalities/<target_id>")
    async def get_personality(request, target_id):
        return await PathView._get_path(request, target_id, user2user=False)


    @staticmethod
    async def _get_path(request, target_id, user2user):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        pm = ProfileManager(database, geni, token)
        my_profile = await pm.cache()
        logger.debug(my_profile)
        path = await PathManager(database, geni, token).get_paths(my_profile['id'], 0, 1,
                                                                  target_id=target_id,
                                                                  user2user=user2user)
        return json(dict(path[0]) if len(path) > 0 else None, escape_forward_slashes=False)

    @staticmethod
    @bp_paths.get("/users/count")
    async def get_users_count(request):
        return await PathView._count_paths(request, user2user=True)

    @staticmethod
    async def _count_paths(request, user2user):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        connected_only = str(request.args.get('connected_only', True)).lower() == 'true'

        pm = ProfileManager(database, geni, token)
        source_id = request.args.get('source_id')
        if not source_id:
            my_profile = await pm.cache()
            source_id = my_profile['id']

        count = await PathManager(database, geni, token).count_paths(source_id, connected_only, user2user=user2user)

        return json({"count": count}, escape_forward_slashes=False)


class DebugView(HTTPMethodView):
    async def get(self, request: Request):
        if request.ip != '127.0.0.1':
            abort(403)
        d_queues = [
            {"size": q.qsize()} for q in app.ctx.task_queue
        ]
        return json({"ip" : request.ip, "queues": d_queues})

# Add blueprints to the app
Utils.add_blueprint(app, bp_profiles, ProfileView)
Utils.add_blueprint(app, bp_paths, PathView)
Utils.add_blueprint(app, bp_projects, ProjectView)
Utils.add_blueprint(app, bp_debug, DebugView)
app.blueprint(bp_admin)

# Serve static files (for Heroku)
STATIC_FILES_DIR = os.path.join(os.path.dirname(__file__), "..", "app", "dist", "geni-app")
app.static('/', STATIC_FILES_DIR, index="index.html")

ADMIN_PAGE = os.path.join(os.path.dirname(__file__), "admin.html")

@app.get('/admin')
async def admin_page(request):
    return await response.file(ADMIN_PAGE)

@app.exception(NotFound)
async def spa_fallback(request, exception):
    """Serve the Angular app for deep links (e.g. /welcome); real 404s for API paths."""
    if request.path.startswith('/api') or request.path.startswith('/admin'):
        return sanic_json({"error": "not found"}, status=404)
    return await response.file(os.path.join(STATIC_FILES_DIR, 'index.html'))

@app.listener('after_server_start')
async def setup_workers(app, loop):
    from api.path import path_finder_async, path_cleaner

    process_quantity = int(os.environ.get('PROCESS_QUANTITY',
                                          sys.argv[1] if len(sys.argv) > 1 else 0))
    quantity = process_quantity if process_quantity else cpu_count()*2+1

    app.ctx.task_queue = [PriorityQueue() for i in range(0, quantity)]

    # In-flight coroutine(s) that enqueue path-finding tasks for a target.
    # Tracked so a new search can cancel a previous target's enqueuer.
    app.ctx.enqueue_tasks = []

    app.ctx.user2user_result_queue = Queue()

    # One-time preset seed + load personalities
    await seed_presets_if_empty()
    app.add_task(ProfileView.load_personalities())

    # Create concurrent tasks (workers)
    for counter in range(quantity):
        app.add_task(path_finder_async(counter, app.ctx.task_queue[counter], app.ctx.user2user_result_queue, db_url, geni))
    # Create concurrent task for cleaning expired paths
    app.add_task(path_cleaner(db_url, geni))



@app.listener('before_server_start')
async def setup_db(app, loop):
    await database.connect()

@app.listener('after_server_stop')
async def close_db(app, loop):
    await database.disconnect()
    try:
        await geni.close()   # release the shared aiohttp session
    except Exception as e:
        logger.warning(f"Geni session close skipped: {e}")

if __name__ == "__main__":
    worker_quantity = int(os.environ.get('WORKER_QUANTITY', 1))
    APP_PORT = int(os.environ.get('PORT', 4200))

    app.run( port=APP_PORT,
        host=os.environ.get('HOST', "0.0.0.0"),
        debug=False,
        workers=worker_quantity,
        single_process=(worker_quantity == 1))

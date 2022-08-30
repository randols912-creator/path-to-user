import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
import datetime

from dotenv import load_dotenv

from sanic import Sanic, response
from sanic.log import logger, logging
from sanic_cors import CORS, cross_origin
from sanic.response import text, json
from sanic.request import Request
from sanic.views import HTTPMethodView
from sanic.exceptions import abort
from sanic_openapi import doc, swagger_blueprint, api as sanic_api
from collections import defaultdict
from databases import Database
from sqlalchemy import create_engine, and_

from multiprocessing import cpu_count
import aiomonitor
from aiomonitor.utils import all_tasks
import asyncio
from asyncio import PriorityQueue, Queue

from api.utils import Timer
timer = Timer("main", logging.DEBUG)
import random

import socketio

logger.setLevel(logging.DEBUG)

app = Sanic(name='api')
CORS(app, supports_credentials=True)
app.blueprint(swagger_blueprint)

# Load parameters
load_dotenv()
# TODO remove me
app.config['ACCESS_LOG'] = False
app.config['CORS_SUPPORTS_CREDENTIALS'] = True

sio = socketio.AsyncServer(async_mode='sanic', cors_allowed_origins=[])
sio.attach(app)

from api.utils import Utils
from api.models import metadata, paths_table, profiles_table
if os.getenv("GENI_MOCK"):
    from api.mock.geni import GeniClientAsync
else:
    from api.geni import GeniClientAsync
from api.path import PathManager, Task, PATH_FIND_BATCH
from api.profile import ProfileManager
# Enabling async template execution which allows you to take advantage
# of newer Python features requires Python 3.6 or later.
enable_async = sys.version_info >= (3, 6)

# Initialize database
db_url = str(os.getenv("SQLALCHEMY_DATABASE_URI"))
engine = create_engine(db_url, echo = True)
metadata.create_all(engine)

database = Database(db_url)

geni = GeniClientAsync()

bp_profiles = Utils.create_blueprint("profiles")
bp_paths = Utils.create_blueprint("paths")
bp_projects = Utils.create_blueprint("projects")
bp_debug = Utils.create_blueprint("debug")


class Pagination:
    offset = doc.Integer()
    limit = doc.Integer()


TOKEN_PARAM = 'authorization'

class Token:
    access_token = doc.String(name=TOKEN_PARAM, description="Geni access token")
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
    @doc.consumes(Token, location='headers')
    @doc.summary("Cache personality profiles from Geni")
    async def post(self, request: Request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        num_profiles = await ProfileManager(database, geni, token).cache_personalities()
        return json(num_profiles)


    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="id", description="Profile id"))
    @doc.summary("Get profile by id")
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
    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="target_id", description="Target id"))
    @doc.summary("Count profiles")
    async def get_count(request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        # Count personalities from cache
        count = await ProfileManager(database, geni, token).count(request.args.get('target_id'))

        return json({"count": count})

    @staticmethod
    @bp_profiles.get("/geni")
    async def get_geni_profiles(request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        ids = request.args.get("ids")
        fields = request.args.get('fields', '')

        if ids:
            resp, token = await geni.get_profile_details(
                token,
                f'profile?ids={ids}',
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
    @doc.summary("Get project details")
    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="id", description="Project id"))
    async def get(self, request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        id = request.args.get('id')
        if not id:
            abort(403, "Project id is missing")
        project_response = await geni.get_project_details(token, id)
        return json({"project": project_response[0]})

class PathView(HTTPMethodView):

    @doc.summary("Get path details")
    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="source_id", description="Source profile id"))
    @doc.consumes(doc.String(name="target_id", description="Target profile id"))
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
    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="source_id", description="Source profile id (default is current user)"))
    @doc.consumes(doc.String(name="target_id", description="Target profile or project id"))
    @doc.consumes(doc.Boolean(name="reset", description="Whether reset connection cache"))
    @doc.summary("Initiate path search from current user to all personalities")
    async def post_search_personalities(request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        source_id = request.json.get('source_id')
        target_id = request.json.get('target_id')
        if not target_id:
            abort(401, "Target id (profile or project) is mandatory")
        do_reset = request.json.get('reset')
        if do_reset:
            await PathView._reset_connections(token, source_id)

        asyncio.create_task(PathView._post_search_personalities(token, source_id, target_id))
        logger.info(f"Started personalities paths search: {token}, source: {source_id}, target: {target_id}")
        return json({"status": "Started personalities paths search"})

    @staticmethod
    @bp_paths.delete("/personalities")
    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="source_id", description="Source profile id (default is current user)"))
    @doc.summary("Delete paths from user to all personalities")
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
        logger.info(f"Deleted personalities paths search for : {source_id}")
        # Clear all queues
        # for q in app.task_queue:
        #     for _ in range(q.qsize()):
        #         try:
        #             q.get_nowait()
        #             q.task_done()
        #         except:
        #             pass

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
        async for personality, profiles_count in profile_iterator(target_id, iterate=True):
            # Enqueue tasks for finding paths to all personalities
            max_priority = max(2, int(profiles_count / PATH_FIND_BATCH))
            src,tgt = source_profile['id'],personality['id']
            if await path_mgr.get(src, tgt):
                logger.debug(f"Personality path {src} -> {tgt} already exists - skipping")
                continue
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
                      "token": token},
                      task_priority))
            if len(batch) >= PATH_FIND_BATCH:
                q_index = PathView._choose_queue_index()
                await app.task_queue[q_index].put((random.randint(1, max_priority), batch))

                count += len(batch)
                logger.info(f"Added task to queue, count: {count} profiles, queue: {q_index}, queue size: {app.task_queue[q_index].qsize()}")
                batch = []
        # Last batch remainder
        if len(batch):
            q_index = PathView._choose_queue_index()
            await app.task_queue[q_index].put((random.randint(1, max_priority), batch))
            logger.info(f"Added to queue tasks of {count} profiles, queue: {q_index}, queue size: {app.task_queue[q_index].qsize()}")

    @staticmethod
    def _choose_queue_index():
        q_sizes = [q.qsize() for q in app.task_queue]
        min_q_index = q_sizes.index(min(q_sizes))
        logger.info(f"Choosing shortest queue among: {q_sizes}, chosen: {min_q_index}")
        return min_q_index

        #return random.randint(0, len(app.task_queue)-1)

    @staticmethod
    @bp_paths.get("/personalities")
    @doc.consumes(Token, location='headers')
    @doc.consumes(Pagination)
    @doc.summary("Get found paths from current user to all personalities")
    async def get_personalities(request):
        return await PathView._get_paths(request, user2user=False)

    @staticmethod
    async def _get_paths(request, user2user):
        timer.start("PathView:get_paths")
        timer.start("PathView:get_paths:validate_token")
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        timer.stop("PathView:get_paths:validate_token")
        offset = request.args.get('offset', 0)
        limit = request.args.get('limit', 50)
        source_id = request.args.get('source_id')

        pm = ProfileManager(database, geni, token)
        timer.start("PathView:get_paths:cache")
        if not source_id:
            my_profile = await pm.cache()
            source_id = my_profile['id']
            logger.debug(my_profile)

        timer.stop("PathView:get_paths:cache")
        timer.start("PathView:get_paths:query")
        paths = await PathManager(database, geni, token).get_paths(source_id, offset, limit, user2user=user2user)
        timer.stop("PathView:get_paths:query")
        timer.stop("PathView:get_paths")
        return json({"paths": [dict(p) for p in paths]}, escape_forward_slashes=False)

    @staticmethod
    @bp_paths.get("/personalities/<target_id>")
    @doc.consumes(Token, location='headers')
    @doc.summary("Get single path from current user to given personality")
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
    @bp_paths.get("/personalities/count")
    @doc.consumes(Token, location='headers')
    @doc.consumes(Pagination)
    @doc.summary("Get found personalities paths count for current user")
    async def get_personalities_count(request):
        return await PathView._count_paths(request, user2user=False)

    @staticmethod
    @bp_paths.get("/users/count")
    @doc.consumes(Token, location='headers')
    @doc.consumes(Pagination)
    @doc.summary("Get found user paths count for current user")
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
    @doc.consumes(Token, location='headers')
    @doc.summary("Return debug information")
    async def get(self, request: Request):
        if request.ip != '127.0.0.1':
            abort(403)
        d_queues = [
            {"size": q.qsize()} for q in app.task_queue
        ]
        task_dicts = []
        for task in all_tasks(app.loop):
            task_dict = {"id": str(id(task)),
                         "state": task._state,
                         "task": str(task)}
            task_dicts.append(task_dict)
        return json({"ip" : request.ip, "queues": d_queues, "tasks": task_dicts})

# Add blueprints to the app
Utils.add_blueprint(app, bp_profiles, ProfileView)
Utils.add_blueprint(app, bp_paths, PathView)
Utils.add_blueprint(app, bp_projects, ProjectView)
Utils.add_blueprint(app, bp_debug, DebugView)

# Serve static files (for Heroku)
app.static('/', 'src/app/dist/geni-app/')
@app.route('/')
async def handle_request(request):
    return await response.file('src/app/dist/geni-app/index.html')

@app.listener('after_server_start')
def setup_workers(app, loop):
    from api.path import path_finder_async, path_cleaner

    process_quantity = int(os.environ.get('PROCESS_QUANTITY',
                                          sys.argv[1] if len(sys.argv) > 1 else 0))
    quantity = process_quantity if process_quantity else cpu_count()*2+1

    app.task_queue = [PriorityQueue(loop=loop) for i in range(0, quantity)]

    app.user2user_result_queue = Queue(loop=loop)

    # One-time load personalities
    app.add_task(ProfileView.load_personalities())

    # Create concurrent tasks (workers)
    for counter in range(quantity):
        app.add_task(path_finder_async(counter, app.task_queue[counter], app.user2user_result_queue, db_url, geni))
    # Create concurrent task for cleaning expired paths
    app.add_task(path_cleaner(db_url, geni))



@app.listener('before_server_start')
async def setup_db(app, loop):
    await database.connect()

@app.listener('after_server_stop')
async def close_db(app, loop):
    await database.disconnect()
    
if __name__ == "__main__":
    worker_quantity = int(os.environ.get('WORKER_QUANTITY',cpu_count()))
    APP_PORT = int(os.environ.get('PORT', 4200))

    for k, route in app.router.routes_all.items():
        print(f"/{route}]")

    app.run( port=APP_PORT,
        host=os.environ.get('HOST', "127.0.0.1"),
        debug=False,
        workers=worker_quantity)

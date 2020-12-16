import sys, os
import datetime

from dotenv import load_dotenv

from sanic import Sanic, response
from sanic.log import logger
from sanic_cors import CORS, cross_origin
from sanic.response import text, json
from sanic.request import Request
from sanic.views import HTTPMethodView
from sanic.exceptions import abort
from sanic_openapi import doc, swagger_blueprint, api as sanic_api
from jinja2 import Environment, PackageLoader, select_autoescape
from databases import Database
from sqlalchemy import create_engine, and_

from multiprocessing import cpu_count
from asyncio import PriorityQueue

import random

import socketio

sio = socketio.AsyncServer(async_mode='sanic')
app = Sanic(name='api')
CORS(app)
app.blueprint(swagger_blueprint)
sio.attach(app)

# Load parameters
load_dotenv()
# TODO remove me
app.config['ACCESS_LOG'] = False

from api.utils import Utils
from api.models import metadata, paths_table, profiles_table
from api.geni import GeniClientAsync
from api.path import PathManager, Task
from api.profile import ProfileManager
from api.chat import ChatManager
# Enabling async template execution which allows you to take advantage
# of newer Python features requires Python 3.6 or later.
enable_async = sys.version_info >= (3, 6)

# Initialize database
db_url = str(os.getenv("SQLALCHEMY_DATABASE_URI"))
engine = create_engine(db_url, echo = True)
metadata.create_all(engine)

geni = GeniClientAsync()

bp_profiles = Utils.create_blueprint("profiles")
bp_paths = Utils.create_blueprint("paths")
bp_chats = Utils.create_blueprint("chats")


class Pagination:
    offset = doc.Integer()
    limit = doc.Integer()


TOKEN_PARAM = 'authorization'

class Token:
    access_token = doc.String(name=TOKEN_PARAM, description="Geni access token")
    cache = dict()
    cache_valid_seconds = 300

    @staticmethod
    async def validate(request):
        logger.debug(f"Headers: {request.headers}")
        token = request.headers.get(TOKEN_PARAM)
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
    @bp_profiles.get("/cache")
    @doc.consumes(Token, location='headers')
    @doc.summary("Cache personality profiles from Geni")
    async def post(self, request: Request):
        token = await Token.validate(request)

        async with Database(db_url) as database:
            num_profiles = await ProfileManager(database, geni, token).cache_personalities()
        return json(num_profiles)


    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="id", description="Profile id"))
    @doc.summary("Get profile by id")
    async def get(self, request: Request):
        token = await Token.validate(request)
        profile_id = request.args.get('id')
        if not profile_id:
            abort(403, "Profile id is missing")
        async with Database(db_url) as database:
            profile = await ProfileManager(database, geni, token).get(profile_id)
        output = {"profile":  dict(profile) if profile else dict()}
        return json(output)

    @staticmethod
    @bp_profiles.get("/count")
    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="type", description="Profile type", choices=['personality', 'user']))
    @doc.summary("Count profiles")
    async def get_count(request):
        token = await Token.validate(request)
        type = request.args.get('id')
        is_user = (type == 'user')

        async with Database(db_url) as database:
            count = await ProfileManager(database, geni, token).count(is_user)
        return json({"count": count[0]})

def dt_converter(o):
    if isinstance(o, datetime.datetime):
        return o.__str__()
    return o

class PathView(HTTPMethodView):

    @doc.summary("Get path details")
    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="source_id", description="Source profile id"))
    @doc.consumes(doc.String(name="target_id", description="Target profile id"))
    async def get(self, request):
        token = await Token.validate(request)
        source_id = request.args.get('source_id')
        target_id = request.args.get('target_id')
        if not source_id or not target_id:
            abort(403, "Source and/or target profile id is missing")

        async with Database(db_url) as database:
            path = await PathManager(database, geni, token).get(source_id, target_id)
        path = {k:dt_converter(v) for k,v in dict(path).items()}
        return json({"path": path}, escape_forward_slashes=False)

    @staticmethod
    @bp_paths.post("/personalities")
    @doc.consumes(Token, location='headers')
    @doc.summary("Initiate path search from current user to all personalities")
    async def post_search_personalities(request):
        token = await Token.validate(request)
        async with Database(db_url) as database:
            pm = ProfileManager(database, geni, token)
            my_profile = await pm.cache()
            [profiles_count] = await pm.count(is_user=False)
            # First, save/update current user's profile
            await pm.save(my_profile, is_user=True)
            # Enqueue tasks for finding paths to all personalities
            async for personality in pm.iterate_personalities():
                task_priority = random.randint(1, profiles_count)
                await task_queue.put(
                    Task({"source_id": my_profile['id'],
                          "target_id": personality.id,
                          "token": token},
                          task_priority))
            return json({"status": "Started paths search"})

    @staticmethod
    @bp_paths.post("/users")
    @doc.consumes(Token, location='headers')
    @doc.summary("Initiate path search from current user to all active users")
    async def post_search_personalities(request):
        token = await Token.validate(request)
        async with Database(db_url) as database:
            pm = ProfileManager(database, geni, token)
            path_mgr = PathManager(database, geni, token)
            my_profile = await pm.cache()
            [personalities_count] = await pm.count(is_user=False)
            [users_count] = await pm.count(is_user=True)
            # First, save/update current user's profile
            await pm.save(my_profile, is_user=True)
            # Enqueue tasks for finding paths to all active users
            async for user in pm.iterate_users(is_active=True):
                if user.id == my_profile['id']:
                    continue
                # Start search in both directions because we'll need both paths to present it to both
                # users and get "named" relationship which is not symmetric
                for src,tgt in [(my_profile['id'], user.id),
                                (user.id, my_profile['id'])]:
                    if path_mgr.get(src, tgt):
                        logger.debug("Users path {} -> {} already exists - skipping")
                        continue
                    # Task priority will be lower than personalities search
                    task_priority = random.randint(personalities_count, personalities_count + users_count)
                    await task_queue.put(
                        Task({"source_id": src,
                              "target_id": tgt,
                              "token": token},
                             task_priority))
            return json({"status": "Started users paths search"})


    @staticmethod
    @bp_paths.get("/personalities")
    @doc.consumes(Token, location='headers')
    @doc.consumes(Pagination)
    @doc.summary("Get found paths from current user to all personalities")
    async def get_personalities(request):
        return await PathView._get_paths(request, user2user=False)

    @staticmethod
    @bp_paths.get("/users")
    @doc.consumes(Token, location='headers')
    @doc.consumes(Pagination)
    @doc.summary("Get found paths from current user to all other users")
    async def get_users(request):
        return await PathView._get_paths(request, user2user=True)

    @staticmethod
    async def _get_paths(request, user2user):
        token = await Token.validate(request)
        offset = request.args.get('offset', 0)
        limit = request.args.get('limit', 50)
        async with Database(db_url) as database:
            pm = ProfileManager(database, geni, token)
            my_profile = await pm.cache()
            logger.debug(my_profile)
            paths = await PathManager(database, geni, token).get_paths(my_profile['id'], offset, limit, user2user=user2user)
        return json({"paths": [dict(p) for p in paths]}, escape_forward_slashes=False)

    @staticmethod
    @bp_paths.get("/personalities/<target_id>")
    @doc.consumes(Token, location='headers')
    @doc.summary("Get single path from current user to given personality")
    async def get_personality(request, target_id):
        return await PathView._get_path(request, target_id, user2user=False)

    @staticmethod
    @bp_paths.get("/users/<target_id>")
    @doc.consumes(Token, location='headers')
    @doc.summary("Get single path from current user to another user")
    async def get_user(request, target_id):
        return await PathView._get_path(request, target_id, user2user=True)


    @staticmethod
    async def _get_path(request, target_id, user2user):
        token = await Token.validate(request)
        async with Database(db_url) as database:
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
        token = await Token.validate(request)
        connected_only = str(request.args.get('connected_only', True)).lower() == 'true'
        async with Database(db_url) as database:
            pm = ProfileManager(database, geni, token)
            my_profile = await pm.cache()
            logger.debug(my_profile)
            count = await PathManager(database, geni, token).count_paths(my_profile['id'], connected_only, user2user=user2user)
        return json({"count": count}, escape_forward_slashes=False)

class ChatView(HTTPMethodView):

    @doc.summary("Get chat details")
    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="chatmate_id", description="Chatmate id"))
    async def get(self, request):
        token = await Token.validate(request)
        chatmate_id = request.args.get('chatmate_id')
        if not chatmate_id:
            abort(403, "Chatmate profile id is missing")

        async with Database(db_url) as database:
            pm = ProfileManager(database, geni, token)
            cm = ChatManager(database, geni, token)
            my_profile = await pm.cache()
            # If chatmate id is given, find specific chat. Otherwise return all chats of
            # the current user
            if chatmate_id:
                chats = [await cm.get_chat_by_profiles(my_profile['id'], chatmate_id)]
            else:
                chats = [chat for chat in await cm.iterate_chats(my_profile['id'])]
        return json({"chats": chats}, escape_forward_slashes=False)



class ChatsSIO:

    @staticmethod
    @sio.event
    async def connect(sid, environ):
        logger.debug(f'ChatsSIO::connected {sid}')

    @staticmethod
    @sio.event
    async def init(sid, data):
        token = await Token.validate(data['token'])

        async with Database(db_url) as database:
            # Retrieve profile from the token
            pm = ProfileManager(database, geni, token)
            my_profile = await pm.cache()
            for chat in await ChatManager(database, geni, token).iterate_chats(my_profile['id']):
                await sio.enter_room(sid, chat['id'])

    @staticmethod
    @sio.event
    async def message(sid, data):
        token = await Token.validate(data['token'])

        async with Database(db_url) as database:
            # Retrieve profile from the token
            pm = ProfileManager(database, geni, token)
            cm = ChatManager(database, geni, token)
            my_profile = await pm.cache()
            chat = await cm.get_chat_by_profiles(my_profile['id'], data['chatmate_id'])
            await cm.save_message(chat, my_profile['id'], data['message'])
            await sio.emit('message', data, room=chat['id'], skip_sid=sid)

    @staticmethod
    @sio.event
    async def read_ack(sid, data):
        token = await Token.validate(data['token'])

        async with Database(db_url) as database:
            pm = ProfileManager(database, geni, token)
            cm = ChatManager(database, geni, token)
            my_profile = await pm.cache()
            chat = await cm.get_chat_by_profiles(my_profile['id'], data['chatmate_id'])

            await ChatManager(database, geni, token).save_read_ack(chat, my_profile['id'])


    @staticmethod
    @sio.event
    def disconnect(sid):
        logger.debug(f'ChatsSIO::disconnected {sid}')



# Add blueprints to the app
Utils.add_blueprint(app, bp_profiles, ProfileView)
Utils.add_blueprint(app, bp_paths, PathView)

if __name__ == "__main__":
    from api.path import path_finder_async
    import asyncio

    process_quantity = int(os.environ.get('PROCESS_QUANTITY',
                                          sys.argv[1] if len(sys.argv) > 1 else 0))
    quantity = process_quantity if process_quantity else cpu_count()*2+1

    loop = asyncio.get_event_loop()
    task_queue = PriorityQueue()
    workers = []
    # Create concurrent tasks (workers)
    for counter in range(quantity):
        workers.append(app.add_task(path_finder_async(counter, task_queue, db_url, geni)))
    # Create Sanic server
    srv_coro = app.create_server(
        port=int(os.environ.get('PORT', 4200)),
        debug=False,
        return_asyncio_server=True,
        asyncio_server_kwargs=dict(
            start_serving=False
        )
    )
    # Run Sanic server and path workers as concurrent tasks
    srv = loop.run_until_complete(srv_coro)
    try:
        assert srv.is_serving() is False
        loop.run_until_complete(srv.start_serving())
        assert srv.is_serving() is True
        loop.run_until_complete(asyncio.gather(srv.serve_forever()))
    except KeyboardInterrupt:
        srv.close()
        loop.close()

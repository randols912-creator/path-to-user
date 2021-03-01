import sys, os
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

from api.bh import BHData
from api.utils import Utils
from api.models import metadata, paths_table, profiles_table
if os.getenv("GENI_MOCK"):
    from api.mock.geni import GeniClientAsync
else:
    from api.geni import GeniClientAsync
from api.path import PathManager, Task, PATH_FIND_BATCH
from api.profile import ProfileManager
from api.chat import ChatManager
# Enabling async template execution which allows you to take advantage
# of newer Python features requires Python 3.6 or later.
enable_async = sys.version_info >= (3, 6)

# Initialize database
db_url = str(os.getenv("SQLALCHEMY_DATABASE_URI"))
engine = create_engine(db_url, echo = True)
metadata.create_all(engine)

database = Database(db_url)

geni = GeniClientAsync()

bh_data = BHData()

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
    @doc.consumes(doc.String(name="type", description="Profile type", choices=['personality', 'user']))
    @doc.summary("Count profiles")
    async def get_count(request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        type = request.args.get('id')
        is_user = (type == 'user')
        # Count personalities from cache
        count = len(ProfileView.PERSONALITIES) if not is_user else await ProfileManager(database, geni, token).count(is_user)[0]

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
    @doc.summary("Initiate path search from current user to all personalities")
    async def post_search_personalities(request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        asyncio.create_task(PathView._post_search_personalities(token))
        logger.info(f"Started personalities paths search: {token}")
        return json({"status": "Started personalities paths search"})

    @staticmethod 
    async def _post_search_personalities(token):
        pm = ProfileManager(database, geni, token)
        path_mgr = PathManager(database, geni, token)

        my_profile = await pm.cache()
        [profiles_count] = await pm.count(is_user=False)
        # Enqueue tasks for finding paths to all personalities
        max_priority = int(profiles_count/PATH_FIND_BATCH)
        batch = []
        count = 0
        for personality in ProfileView.PERSONALITIES:
            src,tgt = my_profile['id'],personality.id
            if await path_mgr.get(src, tgt):
                logger.debug(f"Personality path {src} -> {tgt} already exists - skipping")
                continue
            task_priority = random.randint(1, profiles_count)
            batch.append(Task({"source_id": src,
                      "target_id": tgt,
                      "is_user2user": False,
                      "pending_ts": None,  # the first time the path became pending
                      "token": token},
                      task_priority))
            if len(batch) >= PATH_FIND_BATCH:
                q_index = random.randint(0, len(app.task_queue)-1)
                await app.task_queue[q_index].put((random.randint(1, max_priority), batch))

                count += len(batch)
                logger.info(f"Added to queue tasks of {count} profiles, queue size: {app.task_queue[q_index].qsize()}")
                batch = []
        # Last batch remainder
        if len(batch):
            q_index = random.randint(0, len(app.task_queue)-1)
            await app.task_queue[q_index].put((random.randint(1, max_priority), batch))
            logger.info(f"Added to queue tasks of {count} profiles, queue size: {app.task_queue[q_index].qsize()}")

    @staticmethod
    @bp_paths.post("/users")
    @doc.consumes(Token, location='headers')
    @doc.summary("Initiate path search from current user to all active users")
    async def post_search_users(request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        pm = ProfileManager(database, geni, token)
        path_mgr = PathManager(database, geni, token)
        my_profile = await pm.cache()
        [personalities_count] = await pm.count(is_user=False)
        [users_count] = await pm.count(is_user=True)
        # First, save/update current user's profile
        await pm.save(my_profile, is_user=True)
        # Enqueue tasks for finding paths to all active users
        # TODO: make iteration work
        #async for user in pm.iterate_users(is_active=True):
        all_users = await pm.fetch_users(is_active=True)
        for user in all_users:
            if user.id == my_profile['id']:
                continue
            # Start search in both directions because we'll need both paths to present it to both
            # users and get "named" relationship which is not symmetric.
            # FIXME: Geni doesn't let to search in the reverse direction, searching only one direction
            batch = []
            for src,tgt in [(my_profile['id'], user.id)]:
                # TODO
                if await path_mgr.get(src, tgt):
                     logger.debug(f"Users path {src} -> {tgt} already exists - skipping")
                     continue
                task_priority = random.randint(1, int(personalities_count/2))
                batch.append(Task({"source_id": src,
                                   "target_id": tgt,
                                   "is_user2user": True,
                                   "pending_ts": None,  # the first time the path became pending
                                   "token": token},
                                  task_priority))
                if len(batch) >= PATH_FIND_BATCH:
                    q_index = random.randint(0, len(app.task_queue)-1)
                    await app.task_queue[q_index].put((random.randint(1, int(personalities_count/2)), batch))
                    batch = []
            # Last batch remainder
            if len(batch):
                q_index = random.randint(0, len(app.task_queue)-1)
                await app.task_queue[q_index].put((random.randint(1, int(personalities_count/2)), batch))

        return json({"status": "Started users paths search for profile {my_profile['id']}"})


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
        timer.start("PathView:get_paths")
        timer.start("PathView:get_paths:validate_token")
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        timer.stop("PathView:get_paths:validate_token")
        offset = request.args.get('offset', 0)
        limit = request.args.get('limit', 50)

        pm = ProfileManager(database, geni, token)
        timer.start("PathView:get_paths:cache")
        my_profile = await pm.cache()
        timer.stop("PathView:get_paths:cache")
        logger.debug(my_profile)
        timer.start("PathView:get_paths:query")
        paths = await PathManager(database, geni, token).get_paths(my_profile['id'], offset, limit, user2user=user2user)
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
    @bp_paths.get("/users/<target_id>")
    @doc.consumes(Token, location='headers')
    @doc.summary("Get single path from current user to another user")
    async def get_user(request, target_id):
        return await PathView._get_path(request, target_id, user2user=True)


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
        my_profile = await pm.cache()
        logger.debug(my_profile)
        count = await PathManager(database, geni, token).count_paths(my_profile['id'], connected_only, user2user=user2user)

        return json({"count": count}, escape_forward_slashes=False)

class ChatView(HTTPMethodView):

    @doc.summary("Get chat details")
    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="chatmate_id", description="Chatmate id"))
    async def get(self, request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))
        chatmate_id = request.args.get('chatmate_id')

        pm = ProfileManager(database, geni, token)
        cm = ChatManager(database)
        my_profile = await pm.cache()
        # If chatmate id is given, find specific chat. Otherwise return all chats of
        # the current user
        if chatmate_id:
            chat = await cm.get_chat_by_profiles(my_profile['id'], chatmate_id)
            # Create chat if doesn't exist
            if not chat:
                chatmate_profile = await pm.get(chatmate_id)
                if chatmate_profile:
                    await cm.save_new_chat(my_profile['id'], chatmate_id)
                    chat = await cm.get_chat_by_profiles(my_profile['id'], chatmate_id)
                else:
                    logger.warning("Trying to create chat for current user {my_profile['id']} with non-existent profile {chatmate_id}")
            chats = [chat] if chat else []
        else:
            chats = await cm.fetch_chats(my_profile['id'])
        return json({"chats": [dict(c) for c in chats]}, escape_forward_slashes=False)

    @bp_chats.get("/messages/count_new")
    @doc.summary("Get new message counts")
    @doc.consumes(Token, location='headers')
    async def get_new_message_counts(request):
        token = await Token.validate(request.headers.get(TOKEN_PARAM))

        pm = ProfileManager(database, geni, token)
        cm = ChatManager(database)
        my_profile = await pm.cache()
        new_message_counts = await cm.count_new_messages(my_profile['id'])
        return json(new_message_counts)



class ChatsSIO:

    profile2sid = defaultdict(set) # user might have multiple connections from different devices
    sid2profile = dict()

    @staticmethod
    @sio.event
    async def connect(sid, environ):
        logger.info(f'ChatsSIO::connected {sid}')

    @staticmethod
    @sio.event
    async def init(sid, data):
        token = await Token.validate(data['token'])

        # Retrieve profile from the token
        pm = ProfileManager(database, geni, token)
        my_profile = await pm.cache()

        ChatsSIO.profile2sid[my_profile['id']].add(sid)

        logger.info(f'ChatsSIO::init {my_profile["id"]}')
        async for chat in ChatManager(database).iterate_chats(my_profile['id']):
            sio.enter_room(sid, chat['id'])

    @staticmethod
    @sio.event
    async def message(sid, data):
        token = await Token.validate(data['token'])

        # Retrieve profile from the token
        pm = ProfileManager(database, geni, token)
        cm = ChatManager(database)
        my_profile = await pm.cache()
        chat = await cm.get_chat_by_profiles(my_profile['id'], data['chatmate_id'])
        logger.info(f'ChatsSIO::message from {my_profile["id"]} to {data["chatmate_id"]}')
        await sio.emit('message', data, room=chat['id'], skip_sid=sid)
        await cm.save_message(chat, my_profile['id'], data['message'])

    @staticmethod
    @sio.event
    async def read_ack(sid, data):
        token = await Token.validate(data['token'])

        pm = ProfileManager(database, geni, token)
        cm = ChatManager(database)
        my_profile = await pm.cache()
        chat = await cm.get_chat_by_profiles(my_profile['id'], data['chatmate_id'])

        await ChatManager(database).save_read_ack(chat, my_profile['id'])


    @staticmethod
    @sio.event
    def disconnect(sid):
        logger.info(f'ChatsSIO::disconnected {sid}')
        profile_id = ChatsSIO.sid2profile.get(sid)
        if profile_id:
            del ChatsSIO.sid2profile[sid]
            # Remove sid from set of current profile connections. If set becomes empty, remove it altogether
            ChatsSIO.profile2sid[profile_id].remove(sid)
            if len(ChatsSIO.profile2sid[profile_id]) == 0:
                del ChatsSIO.profile2sid[profile_id]

    @staticmethod
    async def user2user_result_listener():
        logger.info(f"Starting user2user listener")

        while True:
            path_dict = await app.user2user_result_queue.get()

            cm = ChatManager(database)
            # Save new chat
            chat_id = await cm.save_new_chat(path_dict['source_id'], path_dict['target_id'])
            # Bring chatmates into the new chat room (if they are online)
            for profile_id in (path_dict['source_id'], path_dict['target_id']):
                for sid in ChatsSIO.profile2sid[profile_id]:
                    sio.enter_room(sid, chat_id)
            # Notify both users about new path
            await sio.emit('user2user_path', {'profile_id1': path_dict['source_id'],
                                              'profile_id2': path_dict['target_id']},
                                            room=chat_id)


# Add blueprints to the app
Utils.add_blueprint(app, bp_profiles, ProfileView)
Utils.add_blueprint(app, bp_paths, PathView)
Utils.add_blueprint(app, bp_chats, ChatView)

@app.listener('after_server_start')
def setup_workers(app, loop):
    from api.path import path_finder_async

    process_quantity = int(os.environ.get('PROCESS_QUANTITY',
                                          sys.argv[1] if len(sys.argv) > 1 else 0))
    quantity = process_quantity if process_quantity else cpu_count()*2+1

    app.task_queue = [PriorityQueue(loop=loop)] * quantity
    app.user2user_result_queue = Queue(loop=loop)

    # One-time load personalities
    app.add_task(ProfileView.load_personalities())

    # Create concurrent tasks (workers)
    for counter in range(quantity):
        app.add_task(path_finder_async(counter, app.task_queue[counter], app.user2user_result_queue, db_url, geni))
    # Create concurrent task for u2u results listener
    app.add_task(ChatsSIO.user2user_result_listener())

@app.listener('before_server_start')
async def setup_db(app, loop):
    await database.connect()

@app.listener('after_server_stop')
async def close_db(app, loop):
    await database.disconnect()
    
if __name__ == "__main__":
    worker_quantity = int(os.environ.get('WORKER_QUANTITY',cpu_count()))

    app.run( port=int(os.environ.get('PORT', 4200)),
        host=os.environ.get('HOST', "127.0.0.1"),
        debug=False,
        workers=worker_quantity)

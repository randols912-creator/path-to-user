import sys, os
import logging
import requests

from dotenv import load_dotenv

from sanic import Sanic, response
from sanic.response import text, json
from sanic.request import Request
from sanic.views import HTTPMethodView
from sanic.exceptions import abort
from sanic_openapi import doc, swagger_blueprint, api
from jinja2 import Environment, PackageLoader, select_autoescape
from databases import Database
from sqlalchemy import create_engine, and_

from multiprocessing import Process, Queue, cpu_count
from asyncio import Queue as AsyncQueue

from api.utils import Utils
from api.models import metadata, paths_table, profiles_table
from api.geni import GeniClient, GeniClientAsync
from api.path import PathManager
from api.profile import ProfileManager
# Enabling async template execution which allows you to take advantage
# of newer Python features requires Python 3.6 or later.
enable_async = sys.version_info >= (3, 6)

app = Sanic()
app.static('/', './templates/')
# Load parameters
load_dotenv()
# Initialize database
db_url = os.getenv("SQLALCHEMY_DATABASE_URI")
engine = create_engine(db_url, echo = True)
metadata.create_all(engine)

geni = GeniClientAsync()
# Load the template environment with async support
template_env = Environment(
    loader=PackageLoader('geni', 'templates'),
    autoescape=select_autoescape(['html', 'xml']),
    enable_async=enable_async
)
# Load the template from file
template = template_env.get_template("index.html")

@app.route('/')
async def root(request):
    rendered_template = await template.render_async()
    return response.html(rendered_template)

bp_profiles = Utils.create_blueprint("profiles")
bp_paths = Utils.create_blueprint("paths")


class Pagination:
    offset = doc.Integer()
    limit = doc.Integer()

class Token:
    access_token = doc.String(name="access_token", description="Geni access token")

class ProfileView(HTTPMethodView):
    @bp_profiles.get("/cache")
    @doc.consumes(Token, location='headers')
    @doc.summary("Cache personality profiles from Geni")
    async def post(self, request: Request):
        token = request.headers.get('access_token')
        if not token:
            abort(403, "Access token is missing")

        with Database(db_url) as database:
            num_profiles = await ProfileManager(database, geni, token).cache_personalities()
        return json(num_profiles)


    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="id", description="Profile id"))
    @doc.summary("Get profile by id")
    async def get(self, request: Request):
        token = request.headers.get('access_token')
        profile_id = request.args.get('id')
        if not profile_id:
            abort(403, "Profile id is missing")
        with Database(db_url) as database:
            profile = await ProfileManager(database, geni, token).get(profile_id)
        output = {"profile":  profile if profile else dict()}
        return json(output)

    @staticmethod
    @bp_profiles.get("/count")
    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="type", description="Profile type", choices=['personality', 'user']))
    @doc.summary("Count profiles")
    async def get_count(request):
        token = request.headers.get('access_token')
        type = request.args.get('id')
        is_user = (type == 'user')

        with Database(db_url) as database:
            count = await ProfileManager(database, geni, token).count(is_user)
        return json({"count": count[0]})



class PathView(HTTPMethodView):

    @doc.summary("Get path details")
    @doc.consumes(Token, location='headers')
    @doc.consumes(doc.String(name="source_id", description="Source profile id"))
    @doc.consumes(doc.String(name="target_id", description="Target profile id"))
    async def get(self, request):
        token = request.headers.get('access_token')
        source_id = request.args.get('source_id')
        target_id = request.args.get('target_id')
        if not source_id or not target_id:
            abort(403, "Source and/or target profile id is missing")

        with Database(db_url) as database:
            path = await PathManager(database, geni, token).get(source_id, target_id)
        return json({"path": path})

    @staticmethod
    @bp_paths.post("/personalities")
    @doc.consumes(Token, location='headers')
    @doc.summary("Initiate path search from current user to all personalities")
    async def post_search_personalities(request):
        token = request.headers.get('access_token')
        async with Database(db_url) as database:
            pm = ProfileManager(database, geni, token)
            my_profile = await pm.cache()
            # First, save/update current user's profile
            await pm.save(my_profile, is_user=True)
            # Enqueue tasks for finding paths to all personalities
            async for personality in pm.iterate_personalities():
                await task_queue.put({"source_id": my_profile['id'],
                                "target_id": personality.id,
                                "token": token})
        return text("I am get method")

    @staticmethod
    @bp_paths.get("/personalities")
    @doc.consumes(Token, location='headers')
    @doc.consumes(Pagination)
    @doc.summary("Get found paths from current user to all personalities")
    def get_personalities(request):
        return text("I am get method")

# Add blueprints to the app
Utils.add_blueprint(app, bp_profiles, ProfileView)
Utils.add_blueprint(app, bp_paths, PathView)

if __name__ == "__main__":
    logging.basicConfig(format='%(asctime)s:%(levelname)s:%(message)s', level=logging.DEBUG)
    import multiprocessing_logging
    from api.path import path_finder_worker, path_finder_async
    import asyncio
    import concurrent

    multiprocessing_logging.install_mp_handler()
    process_quantity = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    quantity = process_quantity if process_quantity else cpu_count()*2+1

    loop = asyncio.get_event_loop()
    task_queue = AsyncQueue(loop=loop)  # Queue()
    workers = []
    # Create concurrent tasks (workers)
    for counter in range(quantity):
        workers.append(loop.create_task(path_finder_async(counter, task_queue, db_url, geni)))

    srv_coro = app.create_server(
        port=4200,
        debug=False,
        return_asyncio_server=True,
        asyncio_server_kwargs=dict(
            start_serving=False
        )
    )
    srv = loop.run_until_complete(srv_coro)
    try:
        assert srv.is_serving() is False
        loop.run_until_complete(srv.start_serving())
        assert srv.is_serving() is True
        loop.run_until_complete(asyncio.gather(srv.serve_forever(), *workers))
    except KeyboardInterrupt:
        srv.close()
        loop.close()
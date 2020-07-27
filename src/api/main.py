import sys, os
import logging
import requests

from dotenv import load_dotenv

from sanic import Sanic, response
from sanic.response import text, json
from sanic.views import HTTPMethodView
from sanic.exceptions import abort
from sanic_openapi import doc, swagger_blueprint, api
from jinja2 import Environment, PackageLoader, select_autoescape
from databases import Database
from sqlalchemy import create_engine

from api.utils import Utils
from api.models import metadata
# Enabling async template execution which allows you to take advantage
# of newer Python features requires Python 3.6 or later.
enable_async = sys.version_info >= (3, 6)

app = Sanic()
app.static('/', './templates/')
# Load parameters
load_dotenv()
# Initialize database
db_url = os.getenv("SQLALCHEMY_DATABASE_URI")
metadata.create_all(create_engine(db_url, echo = True))
database = Database(db_url)

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


class ProfileView(HTTPMethodView):

    @bp_profiles.get("/<profile_id>")
    @doc.summary("Get profile by id")
    def get_one(item_id):
        return text("I am get method")

    @bp_profiles.get("/personalities/count")
    @doc.summary("Count personalities profiles")
    def get_count(request):
        return text("I am get method")

class PathView(HTTPMethodView):

    @bp_paths.post("/personalities/search")
    @doc.summary("Initiate path search from current user to all personalities")
    def post_search(request):
        return text("I am get method")

    @bp_paths.get("/personalities")
    @doc.consumes(Pagination)
    @doc.summary("Get found paths from current user to all personalities")
    def get_personalities(request):
        return text("I am get method")

# Add blueprints to the app
Utils.add_blueprint(app, bp_profiles, ProfileView)
Utils.add_blueprint(app, bp_paths, PathView)

if __name__ == "__main__":
    logging.basicConfig(format='%(asctime)s:%(levelname)s:%(message)s', level=logging.DEBUG)
    app.run(host="0.0.0.0", port=3030)
from sanic import Blueprint
import logging

class Utils:

    @staticmethod
    def create_blueprint(name):
        url_prefix = "/api/v1/" + name
        logging.info(f"Creating blueprint {url_prefix}")
        return Blueprint(f"{name}", url_prefix=url_prefix)

    @staticmethod
    def add_blueprint(app, bp, view):
        bp.add_route(view.as_view(), "/")
        app.blueprint(bp)
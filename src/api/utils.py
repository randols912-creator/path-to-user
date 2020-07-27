from sanic import Blueprint


class Utils:

    @staticmethod
    def create_blueprint(name):
        prefix = "/api/v1/"
        return Blueprint(f"{name}", url_prefix=f"{prefix}{name}")

    @staticmethod
    def add_blueprint(app, bp, view):
        bp.add_route(view.as_view(), "/")
        app.blueprint(bp)
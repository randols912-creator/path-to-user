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


from timeit import default_timer as timer

class Timer:
  def __init__(self, name = "", log_level=logging.DEBUG):
    self.stages = dict()
    self.ts = dict()
    self.name = name
    self.log_level = log_level

  def start(self, stage):
    if not stage in self.stages:
      self.stages[stage] = 0
    self.ts[stage] = timer()

  def stop(self, stage):
    if not stage in self.stages or not stage in self.ts:
      return
    self.stages[stage] += timer() - self.ts[stage]
    del self.ts[stage]

  def print(self, logger):
    for stage,ts in self.stages.items():
      logger.log(self.log_level, "==== Execution time of stage {}::{}:{}".format(self.name,stage, ts))


#web: (cd src; python3 api/main.py)
web: gunicorn src.api.main:app --pythonpath=./src --worker-class sanic.worker.GunicornWorker

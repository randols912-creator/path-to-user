#web: (cd src; python3 api/main.py)
web: gunicorn --bind 0.0.0.0:${PORT} src.api.main:app --pythonpath=./src --worker-class sanic.worker.GunicornWorker

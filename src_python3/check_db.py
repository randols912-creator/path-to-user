from os import (
    path, environ as env
)

from dotenv import load_dotenv

load_dotenv()

if __name__ == '__main__':
    if not path.exists(env['DATABASE_PATH']):
        print('db not found initializing...')
        from models import db_init

        db_init()
    else:
        print('db found!')

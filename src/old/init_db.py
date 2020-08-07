from os import (
    path, environ as env
)

from dotenv import load_dotenv

load_dotenv()

if __name__ == '__main__':
    from models import db_init

    db_init()

#!/usr/bin/env sh

echo 'Checking db'
/usr/bin/env python3 check_db.py

echo 'Starting application'
/usr/bin/env python3 app.py $(($(nproc)+1))
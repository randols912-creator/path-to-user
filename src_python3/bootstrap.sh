#!/usr/bin/env sh

echo 'Starting application'
/usr/bin/env python3 app.py $(($(nproc)+1))
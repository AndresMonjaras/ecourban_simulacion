#!/bin/bash
# uso: shot.sh glb nombre "query" -> salida $OUT/nombre.png
URL="http://127.0.0.1:8765/index.html?glb=$1&$3"
google-chrome --headless=new --no-sandbox --disable-gpu-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --hide-scrollbars --virtual-time-budget=20000 --window-size=${W:-1000},${H:-700} --screenshot=$OUT/$2.png "$URL" >/dev/null 2>&1

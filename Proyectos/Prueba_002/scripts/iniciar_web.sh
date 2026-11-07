#!/usr/bin/env bash
set -euo pipefail
RAIZ="/mnt/BancaPET/Proyectos/Prueba_002"
export npm_config_cache="/mnt/BancaPET/Cache/npm"
mkdir -p "$npm_config_cache"
cd "$RAIZ/web"
npm run dev -- --host 0.0.0.0 --port 5174

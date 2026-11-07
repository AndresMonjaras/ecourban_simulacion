#!/usr/bin/env bash
set -euo pipefail

RUTA_WEB="/mnt/BancaPET/Proyectos/Prueba_004/web"
export npm_config_cache="/mnt/BancaPET/.cache/npm"

cd "$RUTA_WEB"
npm run dev

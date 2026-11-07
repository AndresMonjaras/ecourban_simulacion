#!/usr/bin/env bash
set -euo pipefail

RAIZ="/mnt/BancaPET/Proyectos/Prueba_001"
RUNTIME="/mnt/BancaPET/.runtime"
APPIMAGE="/mnt/BancaPET/Aplicaciones/FreeCAD/FreeCAD_1.1.4-Linux-x86_64-py311.AppImage"
MACRO="${RAIZ}/scripts/generar_cubo.FCMacro"
GLB_ORIGEN="${RAIZ}/modelos/cubo.glb"
GLB_WEB="${RAIZ}/web/public/models/cubo.glb"

# Mantiene preferencias, temporales y la caché de npm en el disco secundario.
export HOME="${RUNTIME}/home"
export TMPDIR="${RUNTIME}/tmp"
export XDG_CONFIG_HOME="${RUNTIME}/config"
export XDG_CACHE_HOME="${RUNTIME}/cache"
export XDG_DATA_HOME="${RUNTIME}/data"
export NPM_CONFIG_CACHE="/mnt/BancaPET/Cache/npm"
export npm_config_cache="/mnt/BancaPET/Cache/npm"
export QT_QPA_PLATFORM="offscreen"

mkdir -p \
  "${HOME}" "${TMPDIR}" "${XDG_CONFIG_HOME}" "${XDG_CACHE_HOME}" \
  "${XDG_DATA_HOME}" "${NPM_CONFIG_CACHE}" \
  "${RAIZ}/web/public/models" "/mnt/BancaPET/Temporales"

if [[ ! -x "${APPIMAGE}" ]]; then
  echo "No se encontró el AppImage de FreeCAD: ${APPIMAGE}" >&2
  exit 1
fi

# Genera el modelo CAD si aún no existe el GLB.
if [[ ! -s "${GLB_ORIGEN}" || ! -s "${RAIZ}/cad/cubo.FCStd" || ! -s "${RAIZ}/cad/cubo.step" ]]; then
  echo "Generando el cubo con FreeCAD..."
  "${APPIMAGE}" freecadcmd "${MACRO}"
fi

if [[ ! -s "${GLB_ORIGEN}" ]]; then
  echo "FreeCAD no produjo modelos/cubo.glb." >&2
  exit 1
fi

cp -f "${GLB_ORIGEN}" "${GLB_WEB}"

cd "${RAIZ}/web"
if [[ ! -x "node_modules/.bin/vite" ]]; then
  npm install --no-audit --no-fund
fi

exec npm run dev -- --host 127.0.0.1 --port 5173 --strictPort

#!/usr/bin/env bash
# Genera el CAD y ejecuta las tres mallas de la Prueba 001.
set -euo pipefail

RAIZ="/mnt/BancaPET/Proyectos/Prueba_001_CuboPET"
APPIMAGE="/mnt/BancaPET/Aplicaciones/FreeCAD/FreeCAD_1.1.4-Linux-x86_64-py311.AppImage"
RUNTIME="/mnt/BancaPET/.runtime"

if [[ ! -x "${APPIMAGE}" ]]; then
    echo "No se encontró el AppImage ejecutable: ${APPIMAGE}" >&2
    exit 10
fi

mkdir -p "${RAIZ}"/{config,cad,scripts,scripts/bin,mallas,simulaciones,resultados,graficas,evidencias}
umask 077
mkdir -p "${RUNTIME}"/{home,tmp,config,cache,data,run,matplotlib}
chmod 700 "${RUNTIME}/run"

export HOME="${RUNTIME}/home"
export TMPDIR="${RUNTIME}/tmp"
export XDG_CONFIG_HOME="${RUNTIME}/config"
export XDG_CACHE_HOME="${RUNTIME}/cache"
export XDG_DATA_HOME="${RUNTIME}/data"
export XDG_RUNTIME_DIR="${RUNTIME}/run"
export PYTHONDONTWRITEBYTECODE=1
export QT_QPA_PLATFORM=offscreen
export PATH="${RAIZ}/scripts/bin:${PATH}"

cd "${RAIZ}"
echo "[Prueba 001] Generando CAD"
"${APPIMAGE}" freecadcmd "${RAIZ}/scripts/generar_cubo.FCMacro"

echo "[Prueba 001] Ejecutando FEM con CalculiX"
"${APPIMAGE}" freecadcmd "${RAIZ}/scripts/ejecutar_simulacion.FCMacro"

echo "[Prueba 001] Ejecutando análisis y gráficas SVG"
python3 "${RAIZ}/scripts/analizar_resultados.py"

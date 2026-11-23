#!/bin/bash
# iter.sh <etiqueta> : rig con ARM_X/ARM_DROP/SH_Y del entorno -> poses app -> render
S=/tmp/claude-1000/-home-omarbolanos-Documentos-REPOSITORIOS-ecourban-simulacion/9204fedf-8634-43ea-9461-8d6ca5ee86cc/scratchpad; E=/home/omarbolanos/Documentos/REPOSITORIOS/ecourban_simulacion/experiencia-ecourban
L=$1; cd $S/gen && python3 -I rig_generado.py "/home/omarbolanos/Descargas/6764f31af256049aadd2045db0fedcf7(1).glb" out/it_$L.glb | head -1
CAD=$(python3 -c "import json;print(json.load(open('out/it_${L}_rig.json'))['alturaCaderaReposo'])")
cp $S/gen/poses_app_v4.mjs $E/.tmp_poses_it.mjs; (cd $E && CADERA=$CAD node .tmp_poses_it.mjs $S/gen/out/it_$L.glb $S/work/poses $L >/dev/null; rm -f .tmp_poses_it.mjs)
python3 -I splat_poses.py out/it_$L.glb ../work/poses $L ${POSES:-pie,sentado} ${VIEWS:-0,90} out/it_$L.png ${H:-520} >/dev/null && echo out/it_$L.png

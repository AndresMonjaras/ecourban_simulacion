# Integrante EcoUrban sobre el rig del hombre de traje — candidato v2

**Candidato:** `public/models/persona-articulada-integrante-v2.glb` (19,8 MB).
**Fuentes intactas** (sha256 en `verificacion.txt`):
- `persona-articulada.glb`: `c79b78f3…`
- `persona-ecourban-v8.glb`: `00bff8d6…`

**Alcance:**
- Se hizo sin Blender, con numpy, Pillow y Three.js en Node.
- La RAM máxima por paso fue ≈230 MB y no se usó GPU.
- No se tocó `src/` ni se integró en la app. Sin commit ni push.

## Diagnóstico y elección de método
| Alternativa | Resultado |
|---|---|
| A. Recolorear el atlas del destino (v1) | **Descartada.** La ropa del traje está fusionada en la misma malla que el cuerpo (Ready Player Me, 8882 vértices, sin piel debajo del traje). Recolorear deja saco, solapas, chaleco, corbata y faldón, como confirmó la revisión de v1. |
| B. Ocultar la topología del traje y esculpir un cuerpo con camiseta y short | **No viable con garantías.** No hay brazos, piernas ni torso bajo el traje que puedan quedar visibles. Habría que modelar un cuerpo nuevo sin Blender, y además la cara (barba, gafas) seguiría siendo la del destino. |
| C. **Sustituir la malla renderizada por la del integrante (v8) y retargetearla al esqueleto Mixamo del destino** | **Elegida.** v8 ya es el integrante (cara, gorra con emblema, camiseta raglán, short con cordón, tenis). Basta con reubicar su geometría en el espacio de bind del destino y pasar sus pesos Rigify a los 67 joints Mixamo. |

## Cómo se hizo (`scripts/retarget.py`, `scripts/build_v2.py`)
1. **Re-pose LBS con los pesos propios de v8.**
   - Cada hueso DEF-* de v8 rota para apuntar como su hueso Mixamo correspondiente, conservando las longitudes de v8. Así pasa de pose T a la pose A del destino.
   - Las manos se alinean por dirección y plano de la palma.
   - Dedos, palmas y pelvis siguen rígidamente a su hueso padre.
2. **Warp thin-plate (TPS) suave** que lleva las articulaciones re-posadas de v8 exactamente sobre las articulaciones Mixamo del destino (residuo 0,25 mm). Usa estos puntos de control:
   - las articulaciones de columna, cadera, rodilla, tobillo y dedos del pie, hombro, codo, muñeca y nudillos;
   - la suela, apoyada en y=0;
   - anillos de grosor en brazos y piernas;
   - puntos laterales del torso;
   - una "jaula" alrededor de la cabeza que mantiene la cabeza de v8 a escala 1, para que la cara no se deforme.

   El cuello usa un 25 % de la longitud del destino y un 75 % de la de v8. El determinante mínimo del Jacobiano es 0,22 (>0), así que no hay pliegues ni inversiones. Las normales se transforman con la rotación LBS y la inversa transpuesta del Jacobiano TPS.
3. **Pesos:** cada DEF-* se asigna a su joint Mixamo.
   - Ejemplos: thigh y thigh.001 → UpLeg; spine.004 y .005 → Neck; spine.006 → Head; palm.* → Hand; f_index.03 → HandIndex3.
   - Los duplicados se suman y se conservan los 4 pesos mayores, normalizados.
4. **Ensamblado:**
   - Los nodos 0–67 (67 huesos y `Armature`), el skin, el orden de joints y las inverseBindMatrices se copian **sin cambios** del destino.
   - Se reemplazan las dos mallas `Wolf3D_*` por una sola malla, `Integrante_EcoUrban`.
   - Esa malla usa el material PBR 2K de v8 (base color, normal, metal/rugosidad, PNG sin recomprimir), con UV = TEXCOORD_1 de v8.
   - Se omitieron COLOR_0 (todo blanco) y COLOR_1 (no lo usa el material).

## Validación (`verificacion.txt`)
- **GLTFLoader y SkeletonUtils.clone (Three 0.187):** cargan sin errores. Hay 67 huesos con nombres, padres y transformaciones de reposo **idénticos** a la fuente (comparación exacta). El JSON de los nodos 0–66 y los joints del skin también son idénticos, y las inverseBindMatrices son iguales.
- **Pesos:** suman exactamente 1, sin negativos, NaN ni índices fuera de rango.
- **Deformación por hueso:** Head, Neck, Spine, Spine2, brazos, antebrazos, muslos, piernas y pie. Cada rotación mueve la región esperada (por ejemplo, Head 10 668 vértices y LeftUpLeg 17 946), sin valores no finitos. Al restaurar el reposo, el residuo es 0.
- **Poses procedurales reales de la app:** se importaron `animacionPersona.ts` y `adaptadorRigPersona.ts` sin modificar, con una copia literal de `PERFIL_ACTION_SUIT`.
  - Se probaron de pie (p=0), marcha (p=0.17 y 0.26), sentándose (0.86) y sentado (1.0).
  - No hay vértices no finitos.
  - Suela de pie: y_min −0,001 (igual que el original, −0,007).
  - Altura de pie: 1,76 m frente a 1,77 m del original.
- **Medidas en reposo:** bbox 0,98 × 1,86 × 0,43 m, frente a 1,06 × 1,87 × 0,38 m de la fuente.

## Capturas (`capturas/`, rasterizador ortográfico propio, sin Cycles)
- `poses_app_original_v1_v2.png`: filas original, v1 y v2; columnas de pie, marcha A, marcha B y sentado, cada una de frente y de perfil.
- `comparacion_original_v1_v2_reposo.png`: frente, espalda, perfil y tres cuartos de los tres modelos.
- `referencia_v8_frente_espalda_perfil_34.png`, `v2_frente_espalda_perfil_34.png`, `v2_detalle_cabeza_torso.png`, `v2_detalle_tenis.png`.

En v2 ya **no queda nada del traje**: ni saco, ni solapas, ni chaleco, ni corbata, ni faldón. Tampoco quedan las gafas ni la barba del destino. Se ven la camiseta blanca con raglán azul cielo, el short gris oliva con cordón blanco, la gorra negra con emblema verde y los tenis blanco/rojo/negro de v8.

## Limitaciones
- **Proporciones:** el esqueleto Mixamo tiene hombros más estrechos (brazo en x=0,166 m frente a 0,27 m en v8) y brazos más largos que v8. El warp ajusta v8 a ese esqueleto:
  - los hombros y las mangas raglán quedan algo más caídos y estrechos que en v8;
  - el cuello de la camiseta se ve un poco más alto, sobre todo en la nuca, donde la tela forma un pliegue que v8 ya tenía en menor medida.
- **Cabeza y cara:** se conservan a escala 1 con la textura de v8. La cabeza pivota en el joint `Head` del destino, unos 3 cm por encima de la base del cuello de v8. Al cabecear mucho podría verse un leve deslizamiento en el cuello, aunque en las poses de la app no se aprecia.
- **Dedos:** v8 trae pesos irregulares en los dedos (las falanges .02 tienen peso 0). Se mapean tal cual y los dedos siguen a la mano. La app no anima dedos.
- **Calzado:** la suela queda apoyada en y=0. Los tenis conservan la forma de v8 y no la del zapato del destino.
- **Tamaño:** 19,8 MB frente a 2,9 MB del original, por la malla de 88 k vértices y las texturas 2K de v8. Si hace falta, se pueden reducir las texturas a 1K o pasarlas a WebP/KTX2 en un paso posterior.
- Falta verlo en la escena web con su iluminación real. Las capturas usan iluminación plana y no aplican el normal map.

## Reproducir
```
cd scripts && mkdir -p work
python3 -I retarget.py 1.0 1.0 0.25 1.05        # ancho torso, escala cabeza, mezcla cuello, grosor extremidades
python3 -I build_v2.py ../../../../public/models/persona-articulada-integrante-v2.glb
# validar desde experiencia-ecourban/: copiar verify_v2.mjs / poses_app.mjs a la raiz del paquete y ejecutar con node
```

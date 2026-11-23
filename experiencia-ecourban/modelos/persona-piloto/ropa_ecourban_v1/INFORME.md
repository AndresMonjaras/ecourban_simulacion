# Ropa EcoUrban sobre `persona-articulada.glb` — candidato v1

Candidato: `public/models/persona-articulada-ropa-ecourban-v1.glb` (2 408 188 B, sha256 `ec0c5632…934c`).
Fuente intacta: `public/models/persona-articulada.glb` (sha256 `c79b78f3…b080`, sin cambios).
No integrado en la app: `src/` y `PERFIL_ACTION_SUIT` siguen apuntando al GLB original.
Método: scripts Python y numpy sobre el GLB, sin Blender (`scripts/`). RAM máxima ≈120 MB por paso, sin GPU.

## Diagnóstico de la fuente
- Es un avatar Ready Player Me: malla `Wolf3D_Avatar` (8882 vértices) y `Wolf3D_Avatar_Transparent` (748 vértices, lentes de las gafas).
  Las dos usan el mismo atlas 1024² (base color, normal y metal/rugosidad).
  No hay atributos COLOR_0/COLOR_1.
- **La ropa está fusionada con el cuerpo:** no existe piel debajo del traje, salvo pequeños tramos de tobillo y las manos.
  Por eso el short y la manga corta se logran pintando como piel la geometría del pantalón y de la manga del saco.
- Las regiones del atlas **no se pintaron a ciegas**. `texmap.py` rasteriza cada triángulo en espacio UV y guarda, por texel, la posición 3D de bind, la normal y el hueso dominante.
  Ver `scripts/` y la etiqueta de huesos generada durante el diagnóstico.
  Con eso quedan identificadas las zonas: cuadrante UV `u<.5, v>.5` = saco, chaleco, camisa y corbata; `.5≤u<.75, v<.5` = pantalón (hueso pierna) y zapatos (hueso pie/dedos).
  La cabeza, la piel, los ojos, el pelo y la barba quedan fuera y no se tocan.

## Qué se cambió
| Prenda | Regla (posición 3D + hueso, por texel) | Color |
|---|---|---|
| Camiseta | Todo el torso del cuadrante de prenda superior | blanco `#ecebe6` |
| Mangas raglán | Brazo con t<0.42 del húmero, más la franja diagonal cuello→axila | azul cielo `#8db9e3` |
| Brazo desnudo | Brazo con t>0.42 del húmero (manga corta) | piel muestreada del atlas `rgb(206,142,115)` |
| Short | Pantalón por encima de rodilla+7 cm, dobladillo más oscuro | gris olivo/antracita `#55574f` |
| Cordón | Dos tiras blancas al frente, bajo el borde de la camiseta | blanco |
| Pierna | Pantalón bajo rodilla+7 cm | piel |
| Tenis | Base blanca, franja roja sobre la suela, panel lateral rojo, talón y zona de cordones negros | blanco/rojo/negro |
| Gorra | **Malla nueva** `Gorra_EcoUrban`: copa negra, visera (arriba negra, abajo verde), emblema verde | materiales `Gorra_Negro`, `Gorra_Verde` |

- Se conservan la textura de pliegues y el sombreado original, atenuados mediante un filtro de detalle alto.
- En las zonas repintadas como piel, el normal map se dejó plano para que no se vea la trama de tela.
- El canal alfa de las tres imágenes es idéntico al original. El mapa de metal/rugosidad no cambió.
- La gorra tiene 1337 vértices y 2402 triángulos. Usa `skin: 0`, con todos sus vértices al 100 % en el hueso `Head`, y es hija de `Armature`.

## Rig, pesos y UV preservados (`verificacion.txt`)
- Los 15 accessors originales (posiciones, normales, UV, JOINTS/WEIGHTS, índices, inverseBindMatrices) son **byte a byte idénticos**.
- Los nodos 0–69, el skin (67 joints) y las mallas y materiales originales son idénticos. El único cambio estructural es el hijo nuevo 70 dentro de `Armature`.
- Three.js 0.187, GLTFLoader y SkeletonUtils.clone (el mismo camino que `adaptadorRigPersona.ts`):
  - carga sin errores, con 67 huesos y ninguno de los 20 del perfil faltante;
  - un único esqueleto compartido por las cuatro SkinnedMesh;
  - bbox: fuente 1.063×1.871×0.377 m, candidato 1.063×1.881×0.387 m (la gorra añade 1 cm).
- Prueba de pose: al rotar `Head`/`Spine1`, un vértice de la gorra se mueve 0.228 m y su distancia al hueso Head se mantiene en 0.1983 m. La gorra sigue a la cabeza de forma rígida.

## Capturas (`capturas/`, rasterizador propio ortográfico, sin Cycles)
- `comparacion_fuente_vs_candidato.png`: frente, espalda, perfil y ¾, fuente arriba y candidato abajo.
- `candidato_frente_espalda_perfil_34.png`, `candidato_detalle_cabeza_crop.png`, `candidato_detalle_tenis.png`.
- `atlas_antes_despues.png`, `atlas_base_color_nuevo.png`.
- Las capturas usan iluminación plana. No se probó todavía dentro de la escena web con su iluminación y animación.

## Limitaciones (por conservar la geometría exacta)
- **La silueta del traje permanece:** solapas, chaleco, faldón del saco y bolsillos se ven como relieve blanco.
  Se lee como una camisa abierta sobre una camiseta, más que como una camiseta lisa.
  Para una camiseta fiel haría falta geometría nueva de prenda, o pesos que oculten el saco, y eso altera la malla.
- **Piernas y antebrazos desnudos tienen el volumen del pantalón y la manga.** Se ven más gruesos que una pierna real, con un engrosamiento en la muñeca (el puño del saco).
- Las gafas y la barba del avatar destino se mantienen como rasgos propios. La foto de referencia no lleva gafas.
- El emblema de la gorra es un parche liso, no un logotipo. Los tenis siguen un patrón aproximado a las fotos.
- No se usaron texturas del v8 (su rig es Rigify y su UV es distinta). Los colores se tomaron de las fotos.

## Reproducir
Antes, extraer las imágenes del GLB fuente a `work/src_{0,1,2}.png`, por ejemplo con `glb.img`. Después: `cd scripts && mkdir -p work && python3 -I texmap.py && python3 -I paint.py && python3 -I build.py <salida.glb>`. Las rutas fuente son absolutas dentro de los scripts.
Verificar con `python3 -I verify.py <fuente> <candidato>` y con `node verify_three.mjs public/models/`, ejecutado desde `experiencia-ecourban/`.

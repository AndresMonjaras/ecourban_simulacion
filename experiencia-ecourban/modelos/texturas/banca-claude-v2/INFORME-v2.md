# Banca Claude: texturas PBR v2 (candidato)

Candidato derivado de `banca-claude-texturas-v1.blend` (copia de trabajo en Blender headless; la escena abierta del usuario y todos los archivos v1/originales quedaron intactos). No está integrado en ninguna app.

## Entregables
- `modelos/blender/banca-claude-texturas-v2.blend` (2.7 MB, comprimido; v1 = 10.9 MB)
- `public/models/banca-claude-texturas-v2.glb` (3,034,268 B; v1 = 9,985,712 B, -69.6 %)
- mapas finales en esta carpeta; bakes originales 2048 en `fuente-2048/`; scripts reproducibles en `scripts/`
- capturas Three.js v1 vs v2 en `capturas/banca-claude-texturas-v2/`

## Cambios
1. **Geometría para UV**: en la copia v2 se aplicaron Bevel + Weighted Normal de verde/grafito (geometría evaluada idéntica a la exportada en v1: 73 nodos, mismos nombres/TRS/bbox por nodo, 24,772 triángulos en ambos GLB). Se eliminaron los modificadores de esas piezas. Los n-gons de los soportes se triangularon (normales personalizadas conservadas); las arandelas/tornillos de acero también.
2. **UV**: Smart UV (66°) sobre la malla ya biselada + escala uniforme de islas + empaquetado con margen 0.0085 (≈17.4 px a 2048). En v1 el bisel se aplicaba después de los UV y estiraba las bandas del bisel.
3. **Acero**: ahora con UV propio y mapa metal-roughness 512 px (rugosidad 0.20–0.29, metal=1) para recuperar variación sutil.
4. **Rugosidad PET**: variación x1.5 respecto al bake v1 (verde 0.45–0.57, grafito 0.49–0.60).

## Mediciones UV (en 2048; acero en 1024)
| Set | mallas | islas | solape | cobertura | px/mm p1 / p50 / p99 | padding |
|---|---|---|---|---|---|---|
| Verde | 3 | 36 | 0 px | 50.4 % | 1.01 / 1.21 / 1.32 (máx 1.90) | >16 px |
| Grafito | 7 | 42 | 0 px | 41.4 % | 0.64 / 0.75 / 1.00 | >16 px |
| Acero | 19 | 114 | 0 px | 41.2 % | 2.50 / 3.35 / 3.64 | >16 px |

v1 en comparación (geometría evaluada): soportes 1.15 / 1.31 / 3.29 px/mm (hasta 3.52), listones 0.82 / 1.05 / 1.54. Las mallas de los apoyos comparten UV entre sus 8 instancias a propósito.
Prueba de padding: no hay conflicto entre islas distintas al dilatar 8 y 16 px (válido para ~4 niveles de mip a 2048).

## Mapas finales (glTF)
| Archivo | Res. | Color-space | Canales | Bytes |
|---|---|---|---|---|
| banca-claude-verde-basecolor-v2.png | 2048 | sRGB | PNG paleta 256 | 614,267 |
| banca-claude-verde-normal-v2.png | 1024 | Non-Color | tangente, paleta 256 | 441,801 |
| banca-claude-verde-metalrough-v2.png | 1024 | Non-Color | R=1, G=rugosidad, B=0 | 107,495 |
| banca-claude-grafito-basecolor-v2.png | 2048 | sRGB | paleta 256 | 660,345 |
| banca-claude-grafito-normal-v2.png | 1024 | Non-Color | tangente, paleta 256 | 382,865 |
| banca-claude-grafito-metalrough-v2.png | 1024 | Non-Color | R=1, G=rugosidad, B=0 | 98,609 |
| banca-claude-acero-metalrough-v2.png | 512 | Non-Color | R=1, G=rugosidad, B=1 | 102,697 |

Total mapas 2,408,079 B; el GLB embebe 7 PNG/7 texturas y 3 materiales.

## Compresión: pruebas
- Mapas sin optimizar: 2048 = 8.23 MB; 1024 = 2.94 MB.
- 1024 completo se ve más blando en acercamientos (PSNR de render Three.js 44–47 dB frente a 2048) → descartado.
- Paleta de 256 colores en base color y normal: PSNR del mapa 63–84 dB, error máx. 5–13/255; render 66–70 dB frente al 2048 sin optimizar (variante A, GLB 5.65 MB).
- Normal a 1024 con renormalización + MR a 1024/512 (variante elegida, GLB 3.03 MB): render 52–58 dB frente a 2048 sin optimizar, sin diferencia visible en capturas.
- Sin KTX2/WebP/Draco ni extensiones: PNG estándar, GLTFLoader sin cambios.

## Verificación
- Three.js r187 (`GLTFLoader` estándar, Chrome headless + SwiftShader, RoomEnvironment): carga de 73 nodos/mallas con nombres; 73/73 primitivas con UV y 73/73 con TANGENT (las 10 primitivas con normalTexture incluidas). Base sRGB; normal y MR sin color-space; metalnessMap === roughnessMap. Materiales no planos ni invertidos (luz rasante v1 vs v2 coherente).
- Estructura GLB: 73 nodos, 0 TRS distintos, 0 m de diferencia de bbox por nodo respecto a v1.

## Limitaciones residuales (con evidencia en capturas)
- Las costuras UV siguen existiendo en los límites cara plana/bisel y no se orientaron a caras ocultas; en `comparacion-05` y `-08` no se ve salto de patrón/color (el bake viene de un procedimiento continuo en 3D), pero las motas de la banda de bisel salen algo estiradas/suaves.
- La normal a 1024 suaviza ligeramente el microrelieve respecto a 2048 (~55 dB en render; no visible a distancia normal).
- Paleta de 256 colores: posible banding a muy corta distancia; no se ve en capturas.
- Los modificadores de verde/grafito quedaron aplicados en el v2.blend (v1 y banca-claude.blend conservan los modificadores).
- Pruebas con render por CPU (SwiftShader), no GPU real; no se probó en las apps ni en móviles.
- El GLB sigue pesando 3.03 MB (geometría ≈0.6 MB + mapas 2.4 MB).

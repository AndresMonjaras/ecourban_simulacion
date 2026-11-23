# Integrante EcoUrban v3 — modelo construido desde cero por código

**Candidato aislado:** `modelos/persona-piloto/integrante_v3_codigo/persona-articulada-integrante-v3.glb` (≈3,0 MB, 49 820 vértices).
No está en `public/models/` ni integrado en la app. `src/` sin cambios, GLB fuente intacto (sha256 en `verificacion.txt`). Sin commit ni push.

**Herramientas:** sin Blender. Solo numpy (`scripts/genera_v3.py`), que regenera el GLB completo en ≈1 s con unos 70 MB de RAM.

## Idea
En lugar de deformar una malla ajena (v2), cada pieza se **modela alrededor del esqueleto Mixamo existente** (`persona-articulada.glb`): los mismos 67 huesos, con su jerarquía, reposo e inverseBindMatrices intactos.
- Brazos, piernas, torso y cuello son superficies tubulares que siguen la cadena de huesos.
- Cada articulación de la malla coincide con la del rig, y los pesos se asignan por construcción (posición a lo largo de la cadena, con transición suave en codo, rodilla, cuello, hombro y cadera).
- Eso elimina la causa de los hombros levantados y los brazos deformes de v2.

## Proporciones (tomadas del integrante, no inventadas)
Medí la silueta del integrante en `persona-ecourban-v8.glb` por alturas y la adapté a la escala del esqueleto (1,87 m; la app lo muestra a 0,94 ≈ 1,76 m):
- **Torso** robusto con abdomen: semiancho ≈0,19–0,21 m y profundidad frontal mayor que la dorsal.
- **Hombros** con caída natural: la parte alta del deltoides queda al nivel del torso (≈1,55 m), no por encima.
- **Extremidades:** brazo de radio ≈0,055 en el deltoides, ≈0,045 en el antebrazo y ≈0,03 en la muñeca; pierna de ≈0,066 en la pantorrilla y ≈0,038 en el tobillo.
- **Prendas:** short holgado (≈0,10 m de radio) hasta 4,5 cm sobre la rodilla; camiseta hasta la cadera (y = 0,975).
- **Cabeza** de ≈0,18 × 0,24 m.

Colores muestreados de la textura del integrante (v8), coherentes con las fotos:
| Elemento | Color |
|---|---|
| Piel | `#b48a72` |
| Camiseta | blanco `#e9e9e6` con raglán azul cielo `#8fb6e0` |
| Short | gris oliva `#5c5e52`, cordón blanco |
| Gorra | negra `#1f1f21`, emblema y visera inferior verdes `#2f7d3a` |
| Tenis | blancos con franja y panel rojos `#c7202b`, talón, cuello y cordones negros |
| Pelo | `#2a2522` |

## Piezas (6 primitivas, colores por vértice, sin texturas)
| Pieza | Material | Detalle |
|---|---|---|
| camiseta | Tela | Torso de superelipse con dobladillo y cuello. La franja raglán azul va del cuello a la axila, delante y detrás. Mangas cortas azules hasta ~45 % del húmero. |
| piel | Piel | Brazos y piernas continuos (un solo tubo por extremidad, sin juntas), manos con palma y 5 dedos sobre las articulaciones de dedos Mixamo, cuello, cabeza (nariz, mentón, mandíbula, labios, pelo corto pintado) y orejas. |
| short | Tela | Cintura y dos perneras holgadas, cordón blanco colgante. |
| tenis | Calzado | Suela plana en y=0, patrón blanco, rojo y negro. |
| ojos | Ojos | Esclerótica, iris y pupila, cejas. |
| gorra | Gorra | Copa con botón, interior, emblema verde, visera negra arriba y verde abajo. |

## Validación (`verificacion.txt`)
- **Carga y rig:**
  - GLTFLoader y SkeletonUtils.clone (Three 0.187) cargan sin errores.
  - Los 67 huesos tienen nombres, padres y transformaciones de reposo **idénticos** a la fuente.
  - El orden de joints y las inverseBindMatrices son idénticos.
- **Pesos:** suma exacta 1 en las 6 mallas, sin negativos, NaN ni índices fuera de rango.
- **Deformación por hueso:** se rotaron Head, Neck, Spine, Spine2, LeftShoulder, Left/RightArm, Left/RightForeArm, LeftHand, Left/RightUpLeg, Left/RightLeg y LeftFoot.
  - Cada rotación mueve solo su región, con resultados simétricos entre izquierda y derecha y sin valores no finitos.
  - Al restaurar el reposo, el residuo es 0.
- **Poses reales de la app:** se importaron `animacionPersona.ts` y `adaptadorRigPersona.ts` sin modificar, con una copia literal de `PERFIL_ACTION_SUIT`.
  - Se probaron de pie, marcha (2 fases), sentándose y sentado.
  - No hay vértices no finitos.
  - Suela de pie: y_min −0,011. Altura: 1,76 m (original 1,77 m).
- **Medidas en reposo:** bbox 1,08 × 1,87 × 0,36 m, frente a 1,06 × 1,87 × 0,38 m de la fuente.

## Capturas (`capturas/`, rasterizador propio, iluminación plana)
- `comparacion_original_v2_v3_referencia.png`: filas original, v2, v3 y referencia v8.
- `poses_app_original_v2_v3.png`: de pie, marcha A/B, sentándose y sentado, de frente y de perfil.
- `v3_frente_espalda_perfil_34.png`, `v3_detalles_cabeza_tenis_mano.png`.

## Limitaciones
- **Estilo:** es un avatar estilizado de superficies suaves, no un escaneo. La cara es genérica, con rasgos simples, por acuerdo previo.
- **Uniones de piezas:** cuello y cabeza, palma y dedos, y perneras y cintura se intersecan como piezas separadas. Se ve un pliegue en la unión del dorso de la mano con la muñeca y entre los dedos.
- **Telas sin simulación:** la camiseta sigue al torso por pesos. Al sentarse, el dobladillo queda recto y el short muestra la abertura de las perneras desde ciertos ángulos.
- **Manos:** son esquemáticas. Los dedos siguen el abanico del esqueleto, algo cerrado, y no se animan en la app.
- **Normal map:** no hay. El detalle de tela (pliegues, costuras) sería un paso posterior, con texturas o más geometría.
- **Prueba en la escena:** no se probó dentro de la escena web con su iluminación real.

## Reproducir
```
cd scripts && python3 -I genera_v3.py ../persona-articulada-integrante-v3.glb
# validación desde experiencia-ecourban/: copiar verify_v3.mjs y poses_app.mjs a la raíz del paquete y ejecutar con node
```
Los parámetros de proporción están al inicio de cada función `build_*` (`torso_dims`, perfiles `rr` de brazo y pierna, `head_radius`).

## Visor aislado (`visor/`)
Es una página Vite independiente que reproduce la animación real de la app (caminar, girar, sentarse) con la banca oficial. Sirve para comparar candidatos: «Integrante v4», que es el predeterminado, v3 y el original de traje. No modifica `src/`.
```
cd experiencia-ecourban && ./node_modules/.bin/vite --config modelos/persona-piloto/integrante_v3_codigo/visor/vite.config.ts
```
Abrir http://127.0.0.1:5181/. Índice de candidatos: `../CANDIDATOS_RIG_MIXAMO.md`.

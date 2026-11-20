# Fase 2: pulido visual de banca, estaciones y transiciones

## Propósito

Elevar la calidad perceptual de la escena de proceso que acaba de integrarse. La fase busca modelos con siluetas más intencionales, texturas creíbles, materiales coherentes y encuadres cinematográficos legibles. Debe conservar el flujo de scroll, los seis hitos, las etiquetas de estatus y las capacidades de movimiento reducido y fallback.

Esta fase no convierte la escena en prueba de fabricación. La banca, las herramientas, las estaciones y las imágenes generadas son visualizaciones conceptuales.

## Revisión inicial de la implementación

Claude reportó `npm run build`/typecheck correctos y 46 capturas CDP para escritorio y móviles. Codex comprobó HTTP 200 en `127.0.0.1:5177` y revisó capturas de los hitos 02, 04 y 06 en escritorio, además del hito 02 en móvil. El flujo es funcional, pero la diferencia visual respecto al objetivo es marcada:

- La banca del proceso (`BancaProceso.tsx`) usa cubos para los listones y una silueta de soporte mucho más simple que la banca de `Banca.tsx`; al cambiar de sección, el producto pierde continuidad de forma y acabado.
- `materialesProceso.ts` usa materiales planos `MeshStandardMaterial`, a diferencia de mapas procedurales de color, rugosidad, bump y normales del modelo principal.
- La estación de maquila se lee como una gran caja gris; en 1440×900 y móvil el encuadre corta partes de la máquina, por lo que faltan silueta completa, jerarquía y escala legible.
- Los instrumentos del taller se leen como bloques geométricos básicos y ocupan mucho encuadre en comparación con el perfil trabajado.
- El hito de inspección es claro como concepto, aunque el bench, sus líneas de cota y la caja todavía parecen primitivas; debe conservarse el límite de no introducir medidas.
- Las capturas actuales muestran que la narrativa/estatus son legibles; el pulido no debe agregar más texto ni reemplazar las etiquetas factuales.

## Dirección visual

| Eje | Decisión |
|---|---|
| Paleta | Grafito profundo, negro de estudio, verde reciclado oscuro, reflejos marfil cálido y un acento naranja muy pequeño en la interfaz. Evitar plástico verde fosforescente o bordes naranja emisivos. |
| Iluminación | Key cálida grande y suave para describir curvatura; fill frío muy bajo para separar sombra; rim menta tenue para contorno. Sombras de contacto suaves, sin rayos volumétricos ni glow que esconda la textura. |
| Material rPET | Variación de lote de bajo contraste, escamas embebidas pequeñas e irregulares, estrías longitudinales finas en perfiles extruidos, micro-rayas discretas, roughness física y bevels visibles en cantos. No usar partículas grandes brillantes que parezcan confeti. |
| Metal | Acero cepillado satinado con reflejos controlados y geometría de cabeza/arandela; los tornillos siguen marcados como visualización conceptual hasta validar BOM. |
| Maquinaria | Siluetas reconocibles y compuestas por paneles, marco, guías, resguardo y molde; no cajas gigantes lisas. Mostrar la inyectora bajo una marca visual “maquila externa propuesta”, sin logos ni marca comercial. |
| Composición | Un objeto principal por hito; escala de cámara coherente. Debe verse la forma completa de la estación en su toma principal y usar macros breves para detalles. El texto ocupa una banda despejada y no compite con la banca. |
| Movimiento | Match-moves y dolly/orbitas cortas entre hitos, motivadas por el pellet, el perfil o la banca. Mantener `seek(progreso)` como única fuente; cámara y objetos regresan exactamente a sus poses en un mismo progreso. |

## Trabajo en bloques

1. **Continuidad del producto:** alinear `BancaProceso` con la banca ya aprobada en `Banca.tsx`: perfiles redondeados, soporte arqueado, tres listones de respaldo, cuatro de asiento, tornillería conceptual y proporciones visuales compatibles. Evitar una segunda banca con diseño diferente. Compartir geometrías/materiales seguros o extraer fábricas reutilizables sin cambiar la timeline validada de `SeccionDespiece`.
2. **Materiales de rPET:** reutilizar/adaptar las texturas deterministas existentes (map, roughness, bump/normal); ajustar escala/repetición por cara y por tipo de pieza. Verificar que el brillo no aplaste relieve, que el verde siga siendo profundo y que los listones mantengan estrías discretas. Evitar cargar imágenes pesadas como mapas runtime sin optimización.
3. **Estación de maquila:** reemplazar la caja dominante por máquina genérica compuesta y con biseles: bastidor, tolva, cámara de molde, dos mitades con guías/tirantes, paneles de acceso, mangueras y resguardo. No animar un proceso que afirme temperaturas, tiempos o equipo específico. Reencuadrar para mostrar máquina y molde completos en 1440×900 y móvil.
4. **Taller de acabado:** refinar mesa, topes/guías, guarda de sierra, disco y perforadora para que las operaciones sean reconocibles; añadir solo partículas/virutas discretas y deterministas. Mantener herramientas genéricas sin marcas y priorizar el perfil sobre la maquinaria.
5. **Ensamble e inspección:** mejorar pletinas/tornillos como detalle conceptual, encajar el ensamblaje con geometría compartida del bench, y hacer que dimensión/alineación/acabado se lean mediante guías visuales sutiles, sin valores numéricos ni pruebas de carga.
6. **Conexión cinematográfica y adaptación:** revisar focos, exposición, fondo, sombras y recorrido de cámara a través de los seis hitos. En pantallas estrechas, conservar la silueta completa del objeto principal y reducir utilería secundaria antes de recortar la banca.
7. **Cierre de calidad:** revisar capturas en 1440×900, 390×844 y 320×640; bajar/subir scroll y saltar entre progresos; ejecutar build/typecheck, fallback y reduced-motion. Anotar cualquier diferencia que requiera CAD/BOM/ficha de maquila real.

## Guías generadas para esta fase

- `referencias-proceso/estudio-banca-materiales-v1.png`: cuatro cuadros de silueta, costado y macros de rPET/acero. Guía de forma, textura y luz; no es CAD ni una referencia de dimensiones.
- `referencias-proceso/estudio-estaciones-maquila-taller.png`: máquina genérica, banco de corte/perforado y piezas recibidas. Guía para siluetas y composición; no representa instalación real de EcoUrban.
- `referencias-proceso/storyboard-flujo-propuesto.png` y `inspeccion-empaque-conceptual.png`: referencias generadas para el primer flujo.

No integrar estas láminas como evidencia ni como fondo final de página. Usarlas para modelar/dibujar con Three.js y para el criterio de iluminación. Mantener la firma “conceptual/propuesto” de la experiencia.

## Aceptación visual y técnica

- En los hitos 02, 04, 05 y 06 la cámara encuadra la estación y la pieza protagonista completas, sin grandes planos grises recortados ni solapes con marca, etiqueta o sello.
- El modelo de banca conserva una sola identidad entre ambas secciones; los cantos, perfiles, arco, tornillos y texturas se leen en escritorio y móvil sin exagerar el relieve.
- El material conserva matiz oscuro y detalle local tanto en luz alta como en sombra; no hay emisivo plano o zonas quemadas.
- Máquina externa, herramientas y tornillería no incluyen fabricante, medidas ni certificaciones inventadas.
- El mismo progreso produce el mismo resultado al desplazarse adelante, atrás o por saltos. No se modifica `lineaProceso.ts` salvo que exista un defecto reproducible; documentar cualquier cambio necesario y conservar sus ventanas de hitos.
- `prefers-reduced-motion` y fallback 2D continúan mostrando la historia y sus límites.
- `npm run build` pasa y la app permanece local en `127.0.0.1:5177`; sin despliegue, commit o push.

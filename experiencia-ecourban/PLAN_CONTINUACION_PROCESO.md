# Plan: continuación por scroll del proceso propuesto EcoUrban

## Objetivo

Extender el recorrido que termina con la banca ensamblada para que el siguiente scroll explique visualmente, con una escena cinematográfica y capítulos sincronizados, el flujo de fabricación y armado descrito en los documentos del proyecto. La sección nueva se ejecutará solo en localhost durante esta etapa.

Debe sentirse como la continuación de la misma experiencia: fondo de estudio oscuro, banca y materiales como protagonistas, desplazamiento nativo y una sola secuencia visual gobernada por el progreso del scroll. No se añadirán controles de avance ni se montará el simulador BancaPET.

## Estado actual observado

- `App.tsx` monta `SeccionDespiece`; `SeccionProceso.tsx` ya existe con cinco pasos e iconos, pero aún no se monta en `App`.
- La escena de banca usa React, TypeScript, Three.js, React Three Fiber y Anime.js v4. `useProgresoScroll.ts` normaliza el recorrido y `crearLineaDespiece(...).buscar(p)` usa una timeline pausada y reversible.
- El cierre de banca dura 3600 unidades y mantiene la banca ensamblada antes del teaser “Producción y armado · próxima sección”.
- `datos/contenido.ts` enumera cinco pasos generales, pero no muestra toda la secuencia técnica descrita en la propuesta.
- No existe `context-ecourban.md` en la raíz actual. Para esta planeación se consultó el PDF local `Propuesta del Proyecto EcoUrban Innovatec (1).pdf`, en particular la descripción del modelo asset-light y la sección titulada “Flujo de Producción y Ensamble”.

## Base documental y límites de afirmación

La propuesta describe un modelo asset-light: EcoUrban compraría pellets de PET reciclado ya procesados; la recuperación, lavado y pelletizado primario quedan aguas arriba, en proveedores. El moldeo por inyección/extrusión se plantea por maquila externa. La propuesta sitúa en el taller de EcoUrban la recepción de material/piezas, acabado, ensamble, inspección, empaque y despacho.

La misma fuente propone esta secuencia: recepción e inspección de pellets; moldeo externo; enfriamiento y desmolde; recepción de perfiles; corte, perforado guiado y maquinado de bordes; ensamble con tornillería inoxidable; inspección dimensional, de alineación y acabado; empaque y despacho. Son procesos descritos en una propuesta, no evidencia de que una planta, proveedor, maquinaria, prototipo o producción estén operando. La documentación no acredita que el equipo haya ejecutado este flujo ni aporta video/fotografía de una línea real.

Rotulación obligatoria:

- Mantener visible **“Proceso propuesto”** o equivalente durante la nueva sección.
- Nombrar la etapa como **“maquila externa propuesta”**; no representar la inyectora como propiedad de EcoUrban.
- Explicar brevemente que EcoUrban recibe pellets ya reciclados; no animar botellas convirtiéndose directamente en banca ni atribuir reciclaje primario al taller.
- Llamar a la banca **modelo conceptual**. La geometría, uniones y tornillería visibles no certifican planos ni BOM.
- No presentar carga, vida útil, resistencia, certificaciones, proveedor, planta, equipo de marca, lote, prueba de carga, merma ni impacto ambiental como verificados.
- La inspección a ilustrar se limita a lo escrito en la propuesta: revisión de insumo, dimensión, alineación y acabado. No simular una prueba de carga o certificación como un resultado real.
- El empaque/etiquetado descrito documentalmente es una propuesta; no mostrar sello oficial, logotipo NOM ni marcas de conformidad.

## Secuencia visual recomendada

La sección nueva comienza al terminar el teaser de la banca y conserva un canvas/escenario sticky por capítulo. Una timeline Anime.js pausada recibe el progreso normalizado con `seek`; toda pose de cámara, materiales, máquinas, piezas y rótulos debe ser determinista y reversible al subir el scroll.

| Hito | Visual y movimiento de cámara | Texto visible mínimo | Base documental / estatus |
|---|---|---|---|
| 00. Puente | La banca ensamblada de la sección anterior queda en toma general; la cámara se acerca a un puñado de pellets que aparece en primer plano. | “Del material al mobiliario” y sello “Proceso propuesto” | Recurso narrativo; visual conceptual |
| 01. Recepción | Pellets rPET caen en una bandeja de recepción; acercamiento macro a gránulos y muestra. | “Pellets rPET recibidos” / “Inspección de entrada propuesta” | Recepción, pureza, granulometría y humedad mencionadas en la propuesta; no inventar lecturas ni resultados |
| 02. Maquila | Los pellets avanzan a una máquina genérica de moldeo; la cámara se desplaza al molde que cierra y abre. | “Moldeo por maquila externa” | Inyección/extrusión mediante taller externo en el modelo descrito; no afirmar proveedor ni ubicación |
| 03. Enfriamiento y recepción | Piezas conceptuales salen del molde, reposan/enfrían y pasan a una mesa de recepción del taller. | “Enfriamiento · desmolde · recepción” | Pasos narrados por la propuesta; no agregar temperatura, duración o controles no documentados |
| 04. Preparación | Un perfil/listón conceptual se corta, perfora con guía y recibe acabado de borde; cortes de cámara breves, sin mostrar cotas inventadas. | “Corte · perforado · acabado” | Operaciones descritas en la propuesta; geometría sin dimensiones de fabricación |
| 05. Ensamble | Los listones y soportes de la banca actual se acercan a sus posiciones; se representan fijaciones genéricas con tornillos como recurso visual. | “Ensamble mecánico” | La propuesta menciona tornillería inoxidable; el grado/material por pieza requiere confirmar BOM. Mantener la advertencia de modelo conceptual |
| 06. Revisión y salida | Vista de banca armada; líneas sutiles señalan dimensión, alineación y acabado. Entran protección de empaque y caja/área de salida sin etiqueta de certificación. | “Inspección final · empaque · despacho” | Revisiones y empaque descritos, aún no comprobados como operación real |
| Cierre | Regreso a la banca ensamblada; el mensaje de proceso se desvanece al final. | “Flujo propuesto” | Dejar la escena lista para una sección futura, sin inventar una entrega completada |

Evitar tarjetas flotantes repetidas. El recurso memorable es la continuidad del mismo material: pellets → piezas moldeadas → perfiles trabajados → componentes ensamblados. Mantener pocos rótulos, integrados al espacio oscuro, con tipografía, acentos verde/marfil y naranja ya presentes.

## Lenguaje visual y herramientas

- Mantener React + TypeScript + Vite, React Three Fiber/Three.js para escena y Anime.js v4 para timeline pausada con `seek`.
- Priorizar geometría procedural Three.js para pellets, tolva/molde genérico, mesa de trabajo, perfil, herramienta genérica y área de inspección. Reutilizar partes/materiales existentes de `Banca.tsx` donde tenga sentido.
- Los dos archivos de `referencias-proceso/` son **arte conceptual generado**, no fotos de proveedores ni referencia técnica validada. Usarlos para paleta, encuadre, iluminación y composición; no deben presentarse como evidencia. No es obligatorio cargarlos en producción. Si se usan en runtime, optimizar formatos/peso primero.
- No introducir otra librería de animación ni una dependencia 3D adicional sin justificación. No convertir todo en una secuencia de imágenes estáticas: el scroll debe controlar transformaciones/cámara y permitir invertir el movimiento.
- La transición de la banca al proceso debe ser continua, pero la nueva sección debe tener su propio progreso normalizado para no alterar la timeline validada del despiece.

## Bloques implementables y verificables

1. **Contrato de narrativa y datos:** definir seis hitos en un módulo de datos con etiqueta corta, explicación de una línea, estatus documental y referencias a la fuente. Corregir los cinco pasos genéricos existentes si se conservan. Criterio: cada texto puede vincularse a la propuesta y el límite “propuesto/no verificado” aparece sin abrir una ficha.
2. **Base de escena y continuidad:** montar la nueva sección debajo de `SeccionDespiece`; preservar el teaser actual, el scroll nativo y el ancho/altura adaptables. Añadir la nueva escena lazy-loaded y timeline independiente. Criterio: ningún salto, bloqueo o doble control de scroll al cruzar el final de banca.
3. **Escena de materia y maquila (hitos 00–03):** construir pellets, tolva/molde genérico, salida conceptual y cámara entre hitos. Criterio: no hay botellas, marcas, cifras térmicas ni afirmación de planta propia; `maquila externa` resulta legible.
4. **Taller y ensamblaje (hitos 04–05):** mostrar corte/perforado/acabado y la convergencia de componentes de banca; tornillería como visualización conceptual. Criterio: sin cotas, logos de herramientas, BOM inventado o secuencia de fabricación adicional.
5. **Inspección, empaque y cierre (hito 06):** inspección visual de dimensión/alineación/acabado, protección de empaque y salida logística genérica; cerrar en banca armada. Criterio: sin sello NOM, certificado, cliente o despacho real.
6. **Accesibilidad, fallback y rendimiento:** reducir movimiento al usar `prefers-reduced-motion`; fallback 2D con los seis hitos y su estatus; textos anunciados sin duplicación; geometría y luces con perfil lite; revisar carga de chunks y no precargar imágenes pesadas innecesariamente.

## Criterios de aceptación local

- Ejecutar solamente en localhost; no publicar, desplegar ni conectar a una API externa.
- `npm run build` y typecheck limpios.
- Chrome/CDP a 1440×900, 390×844 y 320 px: capturas en cada hito y en los límites de transición; banca/objeto principal no se recorta; título, sello, indicador y ficha no se solapan.
- Scroll hacia abajo, arriba y saltos de progreso arbitrarios producen la misma pose para el mismo progreso; sin `animate()` independiente que desincronice la timeline.
- `prefers-reduced-motion`: no hay cámara orbital ni piezas volando; el contenido de los seis hitos permanece disponible y el paso activo sigue el scroll de forma discreta.
- Fallback sin WebGL: narrativa y etiquetas continúan siendo legibles, sin afirmar que la escena 3D se ejecutó.
- No borrar ni sustituir referencias generadas; no stage/commit/push.

## Referencias visuales locales

- `referencias-proceso/storyboard-flujo-propuesto.png` — lámina generada con cuatro escenas: pellets, moldeo externo conceptual, preparación de perfiles y ensamble.
- `referencias-proceso/inspeccion-empaque-conceptual.png` — escena generada para revisión final y empaque conceptual.

Ambas imágenes se crearon como guías visuales para esta propuesta. Ninguna representa una instalación, prototipo o proceso real de EcoUrban.

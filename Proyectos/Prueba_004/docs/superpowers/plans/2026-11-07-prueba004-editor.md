# BancaPET Prueba 004 — Editor de escenarios 3D: plan de implementación

> **Ejecución:** Codex integra y valida. DeepSeek propone código con comentarios claros en español. Agy realiza la revisión independiente si el servicio lo permite.

**Goal:** Entregar un editor local que arme, transforme, configure y recupere escenarios 3D de banca, persona y peso.

**Architecture:** La UI React/TypeScript comparte `useReducer` entre paneles y escena. Drei aporta TransformControls y OrbitControls; React Three Fiber enruta raycasts de selección y plano de colocación. Los JSON importados se validan en un módulo puro antes de actualizar el estado.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, R3F 9, Drei 10, Three.js 0.187.0, Node 24 `node:test`; sin nuevas bibliotecas de runtime.

**Spec:** `docs/superpowers/specs/2026-11-07-prueba004-editor-design.md` y `docs/mision-prueba004.md`.

## Global Constraints

- Todo el trabajo bajo `/mnt/BancaPET`; ruta física `/mnt/ollama-data/BancaPET`.
- No usar sudo, instalaciones globales, ni modificar Ollama.
- Preservar Pruebas 001, 002 y 003; no hay Prueba 003 presente.
- Código legible junior/intermedio; comentarios simples y breves en español.
- No implementar física, fuerzas, FEM, deformación ni desgaste.
- No afirmar seguridad estructural ni contacto físico.

## Review Focus

- JSON con rutas, propiedades no finitas, IDs repetidos o versiones desconocidas: rechazarlo antes de cambiar el estado.
- Masa, posición y giro editados: conservar kg, mm y grados en interfaz; m y rad en escena/archivo.
- Arrastre de gizmo: pausar órbita y mantener el punto de apoyo en el suelo.
- Colocar o seleccionar con clic y menú derecho: no disparar simultáneamente la acción del plano de suelo.
- Duplicar y eliminar con varias instancias: conservar los demás objetos e IDs únicos.

---

## Estructura de archivos

- `web/src/types/scene.ts`: objeto de escena, tipos y modelo serializable.
- `web/src/utils/units.ts`: conversiones mm/m y grados/radianes.
- `web/src/utils/sceneDocument.ts`: creación, serialización y validación segura del JSON.
- `web/src/stores/sceneReducer.ts`: acciones puras para CRUD, selección y transforms.
- `web/src/components/scene/SceneCanvas.tsx`: cámara Z-up, suelo, colocación y controles.
- `web/src/components/scene/SceneObject.tsx`: banca, maniquí, bloque, resaltado y eventos.
- `web/src/components/editor/PlacementPreview.tsx`: objeto translúcido antes de colocarlo.
- `web/src/components/controls/TransformGizmo.tsx`: transformador y bloqueo de órbita.
- `web/src/components/panels/LibraryPanel.tsx`: banca/persona/peso.
- `web/src/components/panels/ScenePanel.tsx`: árbol, selección, visibilidad y borrar.
- `web/src/components/panels/PropertiesPanel.tsx`: nombre, ID, tipo, transform, escala, dimensiones y masa.
- `web/src/components/panels/ContextMenu.tsx`: acciones de clic derecho limitadas al viewport.
- `web/src/components/editor/EditorPage.tsx`, `web/src/App.tsx`: composición de UI.
- `web/src/styles.css`: editor adaptable con paneles legibles.
- `web/tests/units.test.ts`, `sceneDocument.test.ts`, `sceneReducer.test.ts`: utilidades sin navegador con Node test.
- `modelos/banca.glb`: copia del modelo de Prueba 002; fuente y SHA documentados.
- `scripts/iniciar_web.sh`, `scripts/guardar_escenario.mjs`: inicio local y persistencia de escenarios sólo dentro de Prueba 004.
- `escenarios/`, `evidencias/`, `README.md`, `config/modelos.json`: muestras, capturas, comprobaciones y documentación.

## Tarea 1: fundación, tipos, unidades y documentos

**Interfaces:** `SceneObject`, `SceneDocument`, `parseSceneDocument(text)`, `serializeSceneDocument(objects)` y los cuatro conversores de unidades.

- [ ] Escribir pruebas de unidades, versión/tamaño JSON, IDs duplicados, valores finitos y `modelId` permitido.
- [ ] Ejecutar `node --experimental-strip-types --test tests/units.test.ts tests/sceneDocument.test.ts`; confirmar fallos esperados.
- [ ] Implementar tipos y utilidades mínimas con comentarios de unidades y validación.
- [ ] Volver a correr y confirmar verde.

## Tarea 2: estado CRUD y biblioteca visual

**Interfaces:** reducer `sceneReducer(state, action)`, `createSceneObject(type, id, ordinal)` y datos de biblioteca.

- [ ] Escribir pruebas para IDs distintos al duplicar, borrar sólo selección, togglear visibilidad y mantener selección sincronizada.
- [ ] Confirmar rojo, implementar reducer y factories, confirmar verde.
- [ ] Crear el visor modular, copiar el GLB y agregar maniquí provisional y peso 200 mm/20 kg apoyado en suelo.
- [ ] Build TypeScript.

## Tarea 3: colocación, gizmos y propiedades

- [ ] Implementar preview, puntero al suelo, clic para confirmar y Escape para cancelar.
- [ ] Implementar selección raycast, fondo para limpiar selección y resaltado.
- [ ] Añadir TransformControls translate/rotate y controles orbitales; verificar el bloqueo durante el arrastre y cota Z mínima.
- [ ] Crear árbol y propiedades editables que conviertan unidades y preserven estado visual-only.
- [ ] Conectar menú derecho con acciones reales y mantenerlo dentro del viewport.
- [ ] Build, después pruebas Playwright para agregar objetos, mover/rotar, seleccionar, borrar y menú.

## Tarea 4: persistencia y validación del escenario

- [ ] Añadir importar JSON por archivo, exportar JSON y guardar/recuperar en localStorage.
- [ ] Validar el contenido antes de reemplazar la escena; rechazar archivos grandes/invalidos y rutas no permitidas.
- [ ] Añadir escenario demostrativo sólo bajo `escenarios/`, y ejecutar round-trip: crear, exportar, reiniciar, importar, comparar IDs y transforms.
- [ ] Ejecutar suite de Node, typecheck y build.

## Tarea 5: integración, pruebas visuales y entrega

- [ ] Verificar banca real por hash contra Prueba 002 y preservar Pruebas 001/002 con huellas registradas.
- [ ] En Chrome Playwright probar el flujo solicitado con una banca, dos personas, tres pesos, transforms, propiedades, menú, escape, duplicar/eliminar y JSON round-trip.
- [ ] Guardar diez evidencias visuales y resultados de pruebas en Prueba 004.
- [ ] Solicitar revisión a Agy; si su cuota falla, documentarlo y repetir la revisión independientemente con Codex.
- [ ] Confirmar árbol final y documentar URL, comandos, licencias, limitaciones y estado APROBADA/PARCIAL/FALLIDA.

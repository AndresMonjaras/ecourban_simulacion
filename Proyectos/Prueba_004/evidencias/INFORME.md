# Informe de verificación — Prueba 004

**Estado: PARCIAL.** La aplicación existe y compila, pero no se completó la comprobación de navegador exigida para confirmar todos los gestos, el menú contextual y la recuperación mediante archivo JSON.

## Implementación

- React, TypeScript, React Three Fiber, Drei y Three.js; estado compartido con un reducer y sin nuevas dependencias de ejecución.
- Biblioteca para banca, maniquí provisional y bloque; colocación en suelo Z=0, selección, gizmos de movimiento/rotación, varias vistas, jerarquía y propiedades editables con unidades explícitas.
- Menú contextual, duplicación, visibilidad, eliminación, borrador local, JSON versionado y validación de importación.
- El archivo `modelos/banca.glb` coincide byte por byte con el GLB de Prueba 002. La copia pública del visor conserva el mismo SHA-256: `266a118a2d4d6cb535a2db3486615ef3b5d70fc113f50ad52cee559bf9e7ffc2`.
- Se guardó `escenarios/escenario-validacion.json`, creado a partir del estado serializado del navegador: 1 banca, 2 personas, 3 bloques, IDs únicos, 75 kg por persona y 20 kg por bloque.
- La persona es un maniquí provisional hecho de primitivas; los objetos están marcados como visuales. No hay cálculo de contacto, fuerza ni FEM.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | Pasa |
| `npm test` | 12 pasan, 0 fallan |
| `npm run build` | Pasa; Vite advierte que el bundle principal supera 500 kB |
| Apertura en Chrome mediante la conexión Playwright existente | Pasa; título de Prueba 004, sin errores de consola |
| Objetos de prueba | Se observó el escenario serializado con 1 banca, 2 personas y 3 pesos |
| Persistencia local | La escena persistió durante una recarga del navegador; el estado visible cambió después durante otras interacciones |
| GLB de Prueba 002 | SHA-256 coincidente |
| Importación de archivo en navegador | No verificada: Chrome respondió `DOM.setFileInputFiles: Not allowed`; se canceló el selector y no se repitió la carga bloqueada |
| Descarga de exportación en navegador | El botón actualizó su estado a “Escenario JSON exportado”, pero Playwright agotó el tiempo esperando el evento de descarga; el JSON de evidencia se recuperó del borrador local |
| Clic derecho, arrastre de gizmo y round-trip reiniciar/importar | No verificados de extremo a extremo |

El registro de consola del navegador anotó **cero errores y una advertencia** de `THREE.Clock` deprecado, emitida por el stack gráfico. La advertencia de sombras PCF se eliminó al desactivar sombras del renderer.

## Agentes

- **DeepSeek:** consultado para arquitectura e implementación y se le indicó incluir comentarios cortos y claros en español. Respondió `Server busy, please try again later` en el primer intento y en los dos reintentos pedidos; se continuó manualmente sin inventar una propuesta suya.
- **Agy:** se inició una revisión de solo lectura. No produjo hallazgos porque respondió `RESOURCE_EXHAUSTED (code 429): Individual quota reached`; Codex realizó la revisión técnica y las comprobaciones disponibles.

## Artefactos

- `../escenarios/escenario-validacion.json`: escenario serializado con los seis objetos previstos.
- `editor-vacio.png`: captura del editor vacío.
- `editor-en-navegador.png`: captura de la aplicación en Chrome durante la validación; el número de objetos visible corresponde al estado de esa captura, no al JSON de escenario.
- `../Temporales/pruebas-node.log`, `../Temporales/build.log`, `../Temporales/playwright-console.log`: salidas disponibles de verificación.

## Pendiente para aprobar

Verificar con interacciones reales de navegador el clic derecho y sus seis acciones, mover y rotar arrastrando el gizmo, cambios de campos y la secuencia exportar → reiniciar → importar comparando IDs y transformaciones. También conviene reducir el bundle de Three/R3F antes de producción.

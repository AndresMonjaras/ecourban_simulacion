# BancaPET Prueba 002 — Plan de implementación

> **Ejecución:** Codex implementa en el hilo actual; DeepSeek propone código y Agy revisa cambios.

**Objetivo:** Crear una banca CAD paramétrica de componentes independientes, exportarla a FCStd/STEP/GLB y añadir selección por pieza a un visor web separado de Prueba 001.

**Arquitectura:** Una configuración JSON central alimenta una macro de FreeCAD 1.1.4 que regenera los componentes, guarda FCStd y STEP, y produce un GLB 2.0 con un nodo por componente y un JSON de transformaciones. La aplicación de Prueba 002 reutiliza los controles y la escena de R3F existentes mediante una copia de los fuentes y sus dependencias locales compartidas por enlace simbólico; Prueba 001 no se modifica.

**Tecnologías:** FreeCAD AppImage 1.1.4, Python de FreeCAD, GLB 2.0 serializado con `json`/`struct`, React 19, TypeScript, Three.js, React Three Fiber 9 y Drei 10.

**Especificación:** `~/.codex/attachments/d31ec9ae-d2d7-4358-8b93-ec955fb78365/Pasted text.txt`.

## Enfoques considerados

- **Elegido: FreeCAD genera y exporta cada pieza; la web carga el GLB y resalta el nodo seleccionado.** Conserva CAD real, componentes identificables y el visor conocido.
- Blender como ensamblador sería una dependencia adicional y separaría la fuente paramétrica de la exportación; no mejora esta prueba.
- Construir la banca solo con geometría web incumpliría el requisito de un modelo CAD real.

## Restricciones globales

- Todo el trabajo, descargas, instalaciones, compilaciones, dependencias y temporales permanecen bajo `/mnt/BancaPET` (resuelto físicamente a `/mnt/ollama-data/BancaPET`).
- No modificar Prueba 001, configuración global, Ollama ni archivos de otras pruebas; no usar `sudo`.
- No descargar FreeCAD, Blender ni otras aplicaciones existentes.
- No implementar cargas, FEM ni funciones de Prueba 003; no afirmar seguridad estructural ni aptitud para fabricación.
- Mantener comentarios breves en español y código legible junior-intermedio.

## Decisiones geométricas

- Ejes: X a lo largo de la banca, Y profundidad (frente positivo), Z arriba; medidas CAD en mm y GLB en m.
- Asiento: 5 tablones a lo largo de X; ancho derivado 82 mm y cuatro huecos de 10 mm completan exactamente 450 mm.
- Respaldo: ángulo interior 105° respecto al plano del asiento. Cuatro tablones con ancho calculado sobre la longitud inclinada para alcanzar 850 mm de altura total, con separación de 10 mm.
- Soportes laterales compuestos de vigas rectangulares independientes y travesaños separados; se omiten perfiles poligonales porque el perfil exploratorio no pasó `Shape.isValid()` en FreeCAD 1.1.4. Toda unión por contacto o solape intencional se documentará. Es un diseño visual de referencia, no validación estructural.

## Archivos previstos

- `config/banca.json`: parámetros globales, filas de tablones y dimensiones derivadas.
- `scripts/exportar_banca.py`: triangulación, normales, unidades y escritura GLB por componente.
- `scripts/generar_banca.FCMacro`: creación paramétrica de componentes, metadatos y exportación FCStd/STEP/GLB/JSON.
- `scripts/validar_banca.FCMacro`: validez, cantidad e identificadores de sólidos, límites, separación de piezas, STEP y GLB.
- `scripts/iniciar_web.sh`: entorno aislado bajo `/mnt/BancaPET`, dependencias compartidas cuando existan y Vite en un puerto distinto de Prueba 001.
- `web/`: fuentes copiados/adaptados de Prueba 001; carga de banca, selección/resaltado, detalles de componente y opción de volver al cubo.
- `modelos/`, `cad/`, `evidencias/`, `README.md`: entregables y documentación.

## Review Focus

- Cambio de mm a m y orientación Z-up: validar dimensiones y bounding box del GLB.
- Componentes duplicados o perdidos al exportar: IDs únicos en FCStd, STEP, GLB y `componentes.json`.
- Geometrías degeneradas o inválidas en perfiles y tablones: `Shape.isValid()` y un sólido por componente.
- Contactos entre tablones y soportes: permitir solo uniones documentadas, detectar volumen de intersección no previsto.
- Selección con cámara y controles activos: probar frontal/lateral/superior/isométrica, reset, resaltado y panel de dimensiones.

---

### Tarea 1: Configuración y validador CAD

**Archivos:** Crear `config/banca.json` y `scripts/validar_banca.FCMacro`.

- [x] Definir dimensiones iniciales, número de tablones, ángulo, unidades y fórmulas de ancho derivado.
- [x] Ejecutar el validador antes de generar artefactos; reporta archivos, sólidos, IDs y uniones.

### Tarea 2: Generador CAD y exportación

**Archivos:** Crear `scripts/generar_banca.FCMacro`, `scripts/exportar_banca.py` y artefactos en `cad/` y `modelos/`.

- [x] Crear sólidos independientes para tablones, soportes y costillas; preservar IDs y parámetros en propiedades y configuración central.
- [x] Guardar FCStd y exportar STEP con todos los sólidos; generar GLB 2.0 con nodos separados y `componentes.json`.
- [ ] Ejecutar macro y validador con FreeCAD 1.1.4; comprobar piezas, uniones, cotas, IDs y escala.

### Tarea 3: Visor de Prueba 002

**Archivos:** Crear/adaptar `web/`, `scripts/iniciar_web.sh`.

- [x] Copiar y adaptar fuentes de Prueba 001 sin escribir en su directorio.
- [x] Cargar GLB y metadatos, seleccionar una pieza, resaltarla, mostrar nombre/dimensiones y limpiar selección.
- [x] Mantener cámara, controles, cuadrícula, ejes y vistas; agregar reinicio y selector entre cubo y banca.
- [x] Ejecutar `npm run build` y abrir la banca en la conexión Playwright existente.

### Tarea 4: Evidencias y regresión

**Archivos:** `evidencias/`, `README.md`.

- [x] Capturar isométrica, frontal, lateral, superior y pieza seleccionada con dimensiones. FreeCAD gráfico no estuvo disponible por falta de `xcb-cursor0`; el documento se abrió y validó sin interfaz.
- [x] Verificar selección, controles, errores de consola y HTTP del visor.
- [x] Comparar huellas SHA-256 de los archivos base de Prueba 001; todos coinciden.
- [x] Informar resultados y límites en `INFORME_FINAL.md`. Agy no emitió revisión por cuota 429; Codex completó la revisión independiente.

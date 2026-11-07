# Verificación previa — Prueba 005

## Resultado

La implementación de Prueba 005 se detuvo conforme a la sección 2 de la misión: «Si la Prueba 004 no está funcional, detén la implementación y explica qué dependencia falta».

El editor existente permite crear objetos, seleccionar una instancia y ejecutar su eliminación. Su gizmo transforma un contenedor diferente del objeto cuya transformación se escribe en el estado. El movimiento no persiste. Este defecto impide usar las posiciones del editor como entrada fiable para contactos y cargas.

## Reproducción en Chrome

Se reutilizó la conexión Playwright con Chrome y la pestaña `http://localhost:5175/`, correspondiente a Prueba 004.

1. Se conservó una copia del escenario local inicial.
2. Se agregó un bloque desde Biblioteca, con ID `63dbe770-2afe-49c1-921a-3419bfa90c87`, y se nombró `Verificación P005`.
3. Se colocó su origen en X=0, Y=0, Z=0 mediante Propiedades.
4. Se seleccionó su entrada en Escena y se arrastró el eje X del gizmo mediante eventos reales de ratón de Playwright. La lectura del árbol de Three solo sirvió para localizar el control y registrar sus valores.
5. Durante el arrastre, el contenedor alcanzó X=0.06087773322743145 m, equivalente a 60.87773322743145 mm. La posición local del hijo y la posición persistida permanecieron en `[0, 0, 0]`.
6. Al soltar, el control dejó de estar montado y la transformación guardada continuó en cero. Después de cambiar la selección, el desplazamiento seguía sin guardarse.
7. Se eliminó el objeto de comprobación y se restauró el escenario inicial completo. Se verificó igualdad de sus datos después de recargar.

La evidencia numérica está en `../evidencias/reproduccion-gizmo.json`; la restauración se confirma en `../evidencias/restauracion-escena.json`. Los escenarios anterior y posterior a la comprobación se conservaron en `../Temporales/` para trazabilidad.

## Causa identificada

En `/mnt/BancaPET/Proyectos/Prueba_004/web/src/components/scene/SceneCanvas.tsx:49`, `TransformControls` se usa con hijos y sin la propiedad `object`. La versión instalada de Drei adjunta su propio grupo contenedor (`node_modules/@react-three/drei/core/TransformControls.js:42`).

El callback en `SceneCanvas.tsx:50` lee `group.current`, que corresponde al grupo hijo de la línea 41. Mover el contenedor no modifica la transformación local del hijo. El callback vuelve a guardar la posición y rotación anteriores. También se sitúa el pivote en el origen del contenedor, en vez de la posición de la instancia.

Para satisfacer el requisito previo, el gizmo debe controlar el mismo objeto cuya transformación se guarda, y el arrastre no debe provocar una deselección que descarte el movimiento. La corrección debe verificarse con arrastre, deselección y recuperación de la transformación persistida. Esta corrección no se aplicó, porque la misión prohíbe modificar los originales de pruebas anteriores y ordena detener la implementación en este caso.

## Proyectos y modelos

- Existen Pruebas 001, 002 y 004. Prueba 003 no existe en la ruta indicada; no se le atribuyen resultados FEM ni aprobación.
- El CAD `banca.FCStd`, los nodos/mallas de `banca.glb` y `componentes.json` conservan los mismos 13 identificadores de componente. Codex lo contrastó leyendo el XML del archivo FCStd y el JSON interno del GLB.
- Los IDs reales incluyen `asiento_01` a `asiento_05`, `respaldo_01` a `respaldo_04`, `soporte_izquierdo`, `soporte_derecho`, `costilla_izquierdo` y `costilla_derecho`.
- Prueba 004, en `App.tsx:47`, registra únicamente tres tablones y los IDs inexistentes `soporte_01` y `soporte_02`. Ese metadato debe corregirse antes de generar referencias físicas fiables.
- El exportador tesela cada componente completo; no conserva un mapeo de triángulos a caras CAD ni IDs de superficie estables. Para Prueba 005 sería necesario definir superficies identificadas a partir del CAD o un manifiesto geométrico trazable, sin atribuir exactitud CAD a los índices de triángulos.

El inventario comprobado está en `../evidencias/inventario-modelos.json`. Pueden reutilizarse el GLB por componentes, el CAD paramétrico, el reducer, los tipos y los módulos de persistencia, después de resolver el fallo del editor.

## Almacenamiento e integridad

`/mnt/BancaPET` resuelve a `/mnt/ollama-data/BancaPET`, montado en `/dev/sda3` con ext4 y escritura habilitada. Se comprobó la escritura mediante un archivo temporal propio y había aproximadamente 815 GB disponibles.

No se modificaron archivos originales de Pruebas 001, 002 ni 004: las 102 huellas registradas antes de la comprobación coinciden al finalizar. El inventario excluye dependencias y salidas generadas (`node_modules`, `dist`, `.cache`, `.agy-staff`, `.vite`); véase `../evidencias/integridad-originales.json`.

No se instalaron paquetes, no se ejecutó FEM y no se implementaron contactos, cargas o presiones de Prueba 005. No se ejecutaron compilaciones ni pruebas matemáticas de esa implementación inexistente.

## Colaboración real

Codex revisó el código, ejecutó la reproducción con Playwright, contrastó los identificadores CAD/GLB y comprobó la integridad de archivos. Un subagente de Codex realizó una auditoría estática independiente del gizmo y del inventario, sin editar archivos.

No se enviaron consultas nuevas de implementación a DeepSeek ni Agy: el requisito previo falló antes de iniciar la arquitectura y el código de Prueba 005. Sus fallos de servicio y cuota registrados en Prueba 004 no se presentan como una revisión nueva.

La dependencia pendiente es una versión corregida y verificada de Prueba 004. No se avanzó a Prueba 006.

# EcoUrban — Laboratorio BancaPET

Modelado CAD, visualización y preparación de escenarios para estudiar una banca PET. Este repositorio reúne el código, los modelos, las configuraciones, los resultados disponibles y las evidencias de las pruebas realizadas.

## Estado de las pruebas

| Proyecto | Contenido y estado documentado |
| --- | --- |
| [Prueba 001](Proyectos/Prueba_001/README.md) | Cubo CAD paramétrico y visor 3D. |
| [Prueba 001 CuboPET](Proyectos/Prueba_001_CuboPET/README.md) | Scripts para un caso FEM preliminar; no hay una corrida validada registrada en esta entrega. |
| [Prueba 002](Proyectos/Prueba_002/INFORME_FINAL.md) | Banca paramétrica de 13 componentes, CAD/STEP/GLB y visor. Validación geométrica documentada. |
| Prueba 003 | No existe en los proyectos recibidos; no se le atribuyen resultados FEM. |
| [Prueba 004](Proyectos/Prueba_004/evidencias/INFORME.md) | Editor 3D parcial. El movimiento mediante gizmo no persiste correctamente. |
| [Prueba 005](Proyectos/Prueba_005/README.md) | Implementación detenida por el requisito previo de Prueba 004. Contiene diagnóstico y evidencias; aún no implementa cargas y contactos. |

El [diagnóstico de Prueba 004](Proyectos/Prueba_005/docs/verificacion-prerrequisitos.md) explica el desacople entre el grupo transformado y los datos guardados. La reproducción en navegador registró un desplazamiento del contenedor de 60,88 mm mientras la posición persistida permanecía en cero.

## Abrir el editor de Prueba 004

Requisitos: Node.js 24 y npm.

```bash
git clone https://github.com/AndresMonjaras/ecourban_simulacion.git
cd ecourban_simulacion/Proyectos/Prueba_004/web
npm ci
npm run dev
```

Abre `http://localhost:5175/`. El editor utiliza React, TypeScript, React Three Fiber, Drei y Three.js. Cada proyecto web incluye sus versiones en `package.json` y `package-lock.json`.

Para ejecutar las comprobaciones disponibles de ese proyecto:

```bash
npm test
npm run build
```

Los registros de la entrega están en [evidencias/registros](Proyectos/Prueba_004/evidencias/registros/). Pasar las pruebas de datos y compilación no resuelve el fallo de interacción identificado.

## Modelos y ejecución científica

Los archivos de FreeCAD, STEP, GLB y los metadatos de componentes se conservan dentro de cada prueba. Para regenerar CAD o ejecutar los scripts científicos se necesitan las aplicaciones indicadas en sus README.

Los lanzadores originales esperan el entorno de trabajo `/mnt/BancaPET` y, en algunos casos, un AppImage local de FreeCAD. Esas rutas deben adaptarse al usar otra ubicación. Las aplicaciones externas y las dependencias instaladas se obtienen por separado.

La banca CAD de Prueba 002 describe geometría. Esta entrega no certifica seguridad estructural ni incluye resultados del análisis FEM de la banca completa.

## Publicación

Los archivos de proyectos y registros se publican con sus huellas en [docs/manifest-publicacion.json](docs/manifest-publicacion.json). Se incluyen fuentes, configuraciones, pruebas, CAD, mallas GLB, escenarios e informes.

Las dependencias instaladas, cachés, compilaciones regenerables, respaldos, historiales de agentes y snapshots de conversaciones quedan fuera del repositorio. Los originales en el disco de trabajo se conservaron; esta entrega se preparó en una copia independiente.

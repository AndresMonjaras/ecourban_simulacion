# Banca PET: geometría y acabados

## Archivos

| Archivo | Función |
| --- | --- |
| `web/src/components/scene/bench/BenchModel.tsx` | Carga del GLB e integración con React. |
| `web/src/components/scene/bench/createBenchModel.ts` | UV, materiales, microtextura y reflexión de los tornillos. |
| `web/src/components/scene/bench/benchModelAsset.generated.ts` | Ruta del GLB con versión de contenido; generado automáticamente. |
| `web/scripts/build-bench.mjs` | Generador reproducible de la geometría y materiales básicos. |
| `web/public/models/banca.glb` | Modelo final que carga la aplicación. |

El GLB y el archivo de versión se incluyen en Git. Desde `web/`, ambos se regeneran con:

```bash
npm run model:bench
```

No editar el archivo `.generated.ts` a mano. El hash de la URL evita cargar modelos antiguos desde la caché del navegador o useGLTF. Las imágenes, GLB de referencia y texturas descartadas fueron retirados; no se necesitan para regenerar el modelo.

## Geometría

La silueta se desarrolló a partir de fotografías y referencias de una banca PET. Tiene tres tablones de respaldo, cuatro de asiento, soportes posteriores macizos, refuerzo central, patas abiertas, molduras alrededor de los arcos y bases redondeadas. Las caras ocultas son una interpretación, no una reproducción dimensional exacta del objeto fotografiado.

El generador utiliza RoundedBoxGeometry, perfiles ExtrudeGeometry y molduras tubulares. Los laterales quedan detrás del respaldo. Se conserva el sistema Z arriba, longitud de 1,5 m, profundidad de asiento de 45 cm y superficie de apoyo a 45 cm. El GLB contiene 19.136 triángulos y ocupa aproximadamente 1,48 MB.

Los cálculos existentes de aproximación y sentado conservan envolventes simplificadas de colisión; no se sustituyen por colisiones por triángulo. Los huecos bajo los laterales siguen incluidos en esas envolventes conservadoras.

## Materiales finales

Toda la banca es PET, salvo los ocho tornillos visibles y sus arandelas. No se utilizan vetas de madera ni acabado metálico en los soportes.

| Material | Color | Metalicidad | Rugosidad | Otros parámetros |
| --- | --- | --- | --- | --- |
| PET verde | `#438c69` | 0 | 0,30 | IOR 1,57; especular 0,45; clearcoat 0,08. |
| PET antracita | `#41494c` | 0 | 0,37 | IOR 1,57; especular 0,40; clearcoat 0,05. |
| Acero de cabezas y arandelas | `#929ca5` | 0,90 | 0,32 | Intensidad del entorno 0,85. |
| Interior del encastre | `#737e87` | 0,70 | 0,45 | Intensidad del entorno 0,65. |

El PET es opaco y usa MeshPhysicalMaterial con micrograno isotrópico determinista. La amplitud de bump es 0,01 mm en verde y 0,018 mm en antracita. Las UV mantienen una escala de 5 cm por repetición, con mipmaps y filtrado anisotrópico. El microrelieve no cambia las colisiones.

Los tornillos tienen cabezas biseladas de 12,4 mm, arandelas de 14,2 mm y encastres hexagonales geométricos con fondo gris. Se orientan según la cara del asiento o la inclinación de 15 grados del respaldo. El prefijo `tornillo_` selecciona acero y el sufijo `_cavidad` distingue el interior.

El GLB exportado contiene los colores y parámetros físicos básicos. La aplicación añade la microtextura y un RoomEnvironment prefiltrado mediante PMREM exclusivamente a los tornillos, sin descargas externas ni cambios de iluminación para otros objetos.

## Recursos y corrección del velo blanco

`BenchModel.tsx` crea y adjunta el modelo dentro de un useLayoutEffect. Su limpieza retira el modelo y libera geometrías, materiales, texturas y el render target PMREM. Cada nueva ejecución crea recursos nuevos; no reutiliza texturas destruidas durante el ciclo setup/cleanup/setup de StrictMode. El grupo declara `dispose={null}` porque la liberación es explícita. El GLB compartido por useGLTF permanece intacto.

El PET no recibe el entorno HDR local: sus paneles blancos lavaban el color del acabado. Utiliza las luces de la escena con una capa especular reducida. El usuario confirmó que desapareció el velo blanco al cargar la página. Después se redujo la intensidad del entorno de los tornillos para que se perciban como acero gris.

## Verificación

Se comprueban la regeneración del GLB, su versión de contenido, la compilación TypeScript/Vite y las pruebas existentes del proyecto. Las verificaciones automáticas no sustituyen la revisión visual de materiales en el navegador.

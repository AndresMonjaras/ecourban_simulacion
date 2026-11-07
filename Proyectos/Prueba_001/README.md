# BancaPET — Prueba 001

Modelo CAD paramétrico de un cubo de 100 mm y visor 3D local basado en el mismo modelo.

## Estructura

- `cad/cubo.FCStd`: documento paramétrico de FreeCAD.
- `cad/cubo.step`: geometría CAD exportada para intercambio.
- `modelos/cubo.glb`: malla binaria glTF en metros.
- `web/`: aplicación React y visor Three.js.
- `scripts/generar_cubo.FCMacro`: crea los archivos CAD y la malla GLB.
- `scripts/iniciar_web.sh`: genera el GLB cuando hace falta e inicia Vite.

## Requisitos disponibles en el equipo

- FreeCAD 1.1.4 AppImage en `/mnt/BancaPET/Aplicaciones/FreeCAD/`.
- Node.js 20.19 o posterior.
- npm.

Las dependencias de la web se instalan localmente en `web/node_modules`. La caché de npm, los temporales y los datos de FreeCAD se guardan dentro de `/mnt/BancaPET`.

## Crear el modelo y abrir el visor

Desde la raíz del proyecto:

```bash
./scripts/iniciar_web.sh
```

La primera ejecución crea el cubo, guarda el documento y el STEP, exporta el GLB y lo copia a `web/public/models/cubo.glb`. Después instala las dependencias locales si faltan e inicia el servidor en `http://127.0.0.1:5173`.

Para regenerar todos los archivos CAD y el GLB, eliminar temporalmente `modelos/cubo.glb` antes de iniciar la web. `Part.export` se usa para conservar el centrado del cubo en el archivo STEP.

## Modelo y controles

El cubo es un `Part::Box` de 100 × 100 × 100 mm. Su origen está en el centro y sus límites van de −50 a 50 mm en X, Y y Z. El exportador GLB convierte milímetros a metros.

En el visor se puede orbitar con el botón izquierdo, acercar o alejar con la rueda y desplazar la cámara con el botón derecho. Los botones permiten cambiar a vista frontal, lateral, superior e isométrica; `Restablecer vista` vuelve a la vista isométrica. Los ejes siguen la convención Z arriba. La cuadrícula es paralela al plano XY y se coloca 1 mm bajo la base para que no atraviese el sólido.

La posición del cubo queda vinculada a sus dimensiones: si se cambia Largo, Ancho o Alto en FreeCAD, el origen se mantiene en el centro.

## Comprobación de la web

```bash
cd web
npm run build
```

El proyecto incluye `web/tsconfig.json` para el chequeo de tipos. La verificación de los archivos CAD y del GLB se realiza con `scripts/validar_exportacion.FCMacro` después de generar el modelo.

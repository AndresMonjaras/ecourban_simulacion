# Persona articulada y demostración de la banca

## Organización

- `web/public/models/`: recursos GLB utilizados por la escena.
- `web/src/components/scene/HumanModel.tsx`: carga del GLB, clonación independiente del esqueleto, adaptación de ejes y aplicación de posturas y marcha a los huesos.
- `web/src/components/scene/SceneCanvas.tsx`: integración en la escena, interacción y movimiento del objeto durante la secuencia.
- `web/src/components/scene/PersonActions.tsx` y su CSS: selección de persona y botón de demostración.
- `web/src/types/humanMotion.ts`: contrato compartido de la orden de movimiento.
- `web/src/utils/humanMotion.ts`: planificación del recorrido alrededor de la banca y destino sentado.
- `web/src/utils/humanPose.ts`: cálculo de articulaciones de pie y sentado; conserva los controles manuales.
- `web/src/App.tsx`: coordinación de selección, inicio, cancelación, historial y guardado del resultado.

## Uso

Colocar una banca y una persona sobre el suelo. Seleccionar al personaje desde el panel Escena y pulsar «Caminar a la banca y sentarse», o usar Mayús + S con la persona seleccionada. Escape cancela y restaura la posición original. Al terminar se guardan la transformación y la postura en el estado de la escena, con una entrada de deshacer.

La secuencia consta de caminata, orientación y sentada. El avance de los pasos depende de la distancia recorrida. Se usa el bucle de React Three Fiber; no se añaden bibliotecas de animación.

## Coordenadas y recorrido

El editor usa Z como eje vertical. El GLB humano usa Y vertical y se convierte al renderizar. La banca mide 1.5 m de ancho en su modelo base: sus extremos están en X ±0.75 m. El asiento llega hasta Y ±0.225 m y su superficie está a Z 0.45 m; el respaldo queda hacia Y negativo y la estructura trasera alcanza aproximadamente Y -0.4 m.

La ruta se calcula en coordenadas locales de la banca y luego se transforma a coordenadas de la escena. El rodeo considera el ancho y la profundidad configurados del personaje, además del giro de cuerpo y brazos. Es una aproximación geométrica para la banca de destino; no constituye un motor físico ni navegación general alrededor de todos los objetos de la escena. La figura ilustra el uso de la banca; no calcula su resistencia estructural.

## Recurso visual

Se utilizó un modelo GLB de un humano.

## Comprobaciones

Desde `web/`: `npm run build` comprueba TypeScript y genera la versión de producción. `npm test` ejecuta las pruebas existentes. La comprobación de compilación y las pruebas matemáticas no sustituyen la revisión visual de la animación.

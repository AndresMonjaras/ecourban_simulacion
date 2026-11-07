# BancaPET — Prueba 004

Editor interactivo de escenarios 3D construido sobre el modelo de banca de la Prueba 002.
La escena sirve para organizar objetos visualmente; no calcula contacto, fuerzas ni resistencia.

## Inicio

```bash
/mnt/BancaPET/Proyectos/Prueba_004/scripts/iniciar_web.sh
```

Abre `http://localhost:5175/`.

## Interacciones

- Usa **Biblioteca** para activar una colocación; haz clic en el suelo o presiona Escape para cancelar.
- Selecciona objetos en el visor o en **Escena**. Usa los gizmos para mover y rotar.
- Edita posición en milímetros, rotación en grados, escala y masa en kilogramos desde **Propiedades**.
- Haz clic derecho sobre un objeto para abrir sus acciones.
- Exporta/importa el escenario como JSON. El navegador conserva además un borrador local.
- Los botones de cámara cambian entre vistas isométrica, frontal, lateral y superior.

## Arquitectura

- `web/src/components/scene/SceneCanvas.tsx`: Canvas de Three, modelos, selección y controles.
- `web/src/stores/sceneReducer.ts`: transiciones inmutables de la escena.
- `web/src/utils/sceneFactory.ts`: modelos permitidos, valores iniciales e IDs.
- `web/src/utils/sceneDocument.ts`: exportación e importación validada.
- `web/src/utils/units.ts`: conversiones entre unidades de interfaz y del visor.
- `web/src/App.tsx`: integración de paneles y acciones del editor.

## Dependencias y licencias

Se reutilizan las dependencias ya instaladas de React (MIT), TypeScript (Apache-2.0), Three.js (MIT), React Three Fiber (MIT) y Drei (MIT). No se añadió ninguna dependencia de ejecución. El maniquí se construye con primitivas y está marcado como provisional.

## Verificación

```bash
cd /mnt/BancaPET/Proyectos/Prueba_004/web
npm test
npm run build
```

Los resultados de validación y las limitaciones se guardan en `evidencias/INFORME.md`.

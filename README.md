# ecourban_simulacion

BancaPET · Prueba 005

Aplicación web completa de escenarios 3D. Incluye el editor de la Prueba 004 y añade navegación, apoyo de objetos y caída visual.

## Ejecutar

Desde este directorio:

```bash
cd web
npm ci
npm run dev -- --host 127.0.0.1
```

Abre <http://127.0.0.1:5176/> en Firefox.

## Interacción

- Mantén W/A/S/D para desplazar la vista suavemente por el plano horizontal. AW, AS y DW permiten movimiento diagonal; W+S o A+D cancela el movimiento.
- Agrega un objeto desde Biblioteca y apunta a un espacio libre o a la superficie de la banca para ver su previsualización.
- Haz clic y arrastra un objeto o usa el gizmo para moverlo. Al soltarlo, desciende hasta el apoyo permitido más alto.
- La persona adopta una postura sentada cuando queda apoyada sobre la banca.
- Las bancas solo se apoyan en el suelo. Los bloques pueden apoyarse en el asiento o en otros bloques.
- La colocación rechaza penetraciones detectadas por las envolventes geométricas.

La colocación sobre la banca se comprueba con intersecciones del modelo bajo el cursor y una región de asiento definida. El aterrizaje de objetos movidos usa alturas y envolventes simplificadas; no es una simulación dinámica ni un análisis FEM. No usar sus resultados como validación estructural.

## Verificación

```bash
npm test
npm run build
```

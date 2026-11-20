# EcoUrban — experiencia interactiva

Aplicación React, TypeScript, Three.js, React Three Fiber y Anime.js para presentar la banca conceptual de EcoUrban y su proceso propuesto mediante una experiencia 3D guiada por scroll.

## Ejecutar en local

```bash
cd experiencia-ecourban
npm ci
npm run dev
```

Vite inicia la aplicación en <http://localhost:5177/>.

## Construir

```bash
cd experiencia-ecourban
npm run build
```

La aplicación principal usa el modelo GLB v2 de la banca, sus texturas PBR y los archivos fuente Blender incluidos en `experiencia-ecourban/`. La sección de fabricación existente es preliminar y está pendiente de actualización para seguir la guía técnica de diez etapas; el proceso se presentará como propuesto, no como operación verificada ni resultado de ensayos.

La planificación del flujo técnico está en [docs/guia-integracion-proceso-ecourban.md](docs/guia-integracion-proceso-ecourban.md). El simulador BancaPET ya no forma parte de la aplicación activa ni sus datos geométricos se consideran métricas de fabricación o validación estructural.

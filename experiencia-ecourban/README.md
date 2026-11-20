# Experiencia EcoUrban

Aplicación principal (React + TypeScript + Vite) para presentar la banca conceptual de EcoUrban en una escena 3D cinematográfica. El recorrido se controla con scroll nativo: la banca aparece ensamblada, gira, se separa por capítulos y cambia de cámara mientras se recorre el respaldo, el asiento y los soportes. La secuencia continúa con una visualización del proceso técnico propuesto.

## Ejecutar

```sh
cd experiencia-ecourban
npm ci
npm run dev      # http://localhost:5177
```

Dependencias principales: React, TypeScript, Three.js, React Three Fiber, Anime.js v4 y Vite.

## Recorrido por scroll

- `src/useProgresoScroll.ts` convierte el scroll nativo de la sección en progreso normalizado `0..1`, usando `requestAnimationFrame`.
- `src/componentes/SeccionDespiece.tsx` mantiene la escena fija durante el recorrido y deriva el capítulo activo del progreso; el mismo flujo conserva capítulos legibles con movimiento reducido o sin WebGL.
- `src/escena/despiece.ts` define una timeline pausada de Anime.js. Cámara, giro de la banca, separación y reensamble escalonado de piezas, énfasis y sombras se controlan mediante `seek(progreso)`, por lo que la animación es reversible al desplazarse hacia arriba. Al terminar cada capítulo, las piezas de ese grupo vuelven a su posición ensamblada antes de iniciar el siguiente.
- `src/escena/enfoque.ts` define los umbrales y las tomas de cámara para los capítulos de respaldo, asiento y soportes. Cada capítulo enfoca su pieza y después vuelve a la misma pose general; el siguiente giro comienza desde esa pose.
- `src/App.tsx` conecta el capítulo activo con su contenido informativo.
- `src/datos/contenido.ts` contiene las fichas y el texto descriptivo.
- `src/escena/almacen.ts` conserva el estado mutable que comparten la timeline y la escena sin provocar renders de React en cada frame.

## Modelo y render 3D

- `src/escena/Banca.tsx` instancia `public/models/banca-claude-texturas-v2.glb`; `src/escena/bancaOficial.tsx` agrupa sus 73 nodos en nueve conjuntos animables sin perder sus transformaciones.
- El GLB usa mapas PBR horneados para el rPET verde, grafito y acero. El informe de `modelos/texturas/banca-claude-v2/` documenta UVs, canales, tangentes, compresión y limitaciones.
- `src/escena/Escena.tsx` contiene la cámara, iluminación de estudio, reflejos, sombras y encuadre adaptable.
- Después del despiece de la banca, `SeccionFlujo` contiene una visualización preliminar que todavía debe adaptarse al orden de diez etapas de la nueva guía técnica. Las estaciones actuales son conceptuales y no representan maquinaria ni procesos verificados en una planta. El plan de actualización está en [../docs/guia-integracion-proceso-ecourban.md](../docs/guia-integracion-proceso-ecourban.md).

El modelo sigue siendo una **aproximación visual conceptual** basada en las referencias compartidas. No es un modelo CAD ni confirma el diseño de fabricación, el BOM, las uniones, dimensiones, carga o material específico de cada componente. La tornillería y los relieves son decisiones de visualización pendientes de validar con planos y datos del fabricante. Se conserva la etiqueta «Concepto».

## Accesibilidad y límites

El scroll de la página continúa siendo nativo; no hay scroll-jacking ni controles de selección. `FichaPieza` es una anotación editorial que cambia con el capítulo, sin modal ni controles de cierre, con región `aria-live`. `prefers-reduced-motion` deja estática la banca y conserva el recorrido informativo. El fallback sin WebGL mantiene el cambio de capítulos con scroll.

Las fichas describen la propuesta documental y no validan especificaciones físicas. El proyecto no incorpora certificaciones, ensayos de laboratorio, proveedores contratados ni resultados de impacto medidos.

## Validación registrada

El build de esta aplicación pasa con el modelo v2 activo. La integración se revisó en Chrome en escritorio y móvil emulado a 390 px; el GLB conserva sus 73 nodos y el despiece continúa funcionando. Las comparativas de materiales y geometría v1/v2 están en `capturas/banca-claude-texturas-v2/`. No se validó en dispositivos físicos ni GPU móvil. Vite informa que el chunk 3D supera 500 kB.

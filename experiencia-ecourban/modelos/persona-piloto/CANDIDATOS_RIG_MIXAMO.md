# Candidatos de persona EcoUrban con rig Mixamo (para la animación procedural de la app)

La app anima a la persona con `PERFIL_ACTION_SUIT` (`src/escena/perfilRigPersona.ts`). El perfil activo usa el rig Mixamo compatible de 67 huesos y el modelo del integrante EcoUrban: camiseta blanca con raglán azul, short oliva, gorra negra con emblema verde y tenis blanco/rojo. Los candidatos históricos se conservan para comparación.

**Estado:** el candidato v4 está integrado en la escena principal y en la sección de proceso. La app conserva la animación procedural existente y lo carga directamente desde este GLB; v1 y v2 quedan como candidatos históricos.

| Carpeta | Enfoque | Estado |
|---|---|---|
| `ropa_ecourban_v1/` | Recolorear la textura del traje y añadir gorra. GLB en `public/models/persona-articulada-ropa-ecourban-v1.glb`. | Descartado: el traje seguía visible. |
| `integrante_v2/` | Malla v8 retargeteada con LBS + warp TPS. GLB en `public/models/persona-articulada-integrante-v2.glb`. | Descartado: hombros altos y brazos deformes. |
| `integrante_v3_codigo/` | Avatar modelado desde cero por código alrededor del esqueleto Mixamo. Incluye el **visor aislado** (`visor/`). | Proporciones correctas, pero le faltan los detalles. |
| **`integrante_v4_generado/`** | **El modelo del agente generador 3D, intacto** (ropa, cuerpo y textura), con rig Mixamo ajustado a su pose T. Correcciones de hombros, codo, manga, surcos de los dedos y mancha azul de la textura. | **Integrado** en `Escena` y `EscenaProceso`; candidato aprobado visualmente en el visor. |

Cada carpeta trae su `INFORME.md` (método, validación y limitaciones), su `verificacion.txt`, `capturas/` y los `scripts/` que regeneran su GLB.

## Ver el candidato v4 con la animación y la banca
```
cd experiencia-ecourban
./node_modules/.bin/vite --config modelos/persona-piloto/integrante_v3_codigo/visor/vite.config.ts
# http://127.0.0.1:5181/   (?p=0..1 fija el progreso, ?modelo=v3|original compara)
```
- **Qué usa:** el visor carga `Persona`, `BancaOficial` y `posePersonaParaProgreso` reales de la app, en modo de solo lectura.
- **Perfil:** usa uno propio para v4 (`alturaCaderaReposo: 0.9795`).
- **Cierre:** detenerlo con Ctrl+C cuando no se use. Carga un modelo de 68 MB.

## Integración actual
- `src/escena/perfilRigPersona.ts` carga este GLB como un asset procesado por Vite, sin duplicarlo en `public/models/`.
- El perfil conserva la escala `0.94` y usa `alturaCaderaReposo: 0.9795`, calibrada para la pose T de este rig.
- `Escena.tsx` y `EscenaProceso.tsx` comparten el mismo perfil y la animación canónica de pie, marcha y sentado; no se modificaron sus timelines.
- El archivo pesa 68 MB y contiene 832 mil vértices. La optimización por decimación/compresión queda pendiente antes de considerar una publicación de producción.

## Limitaciones conocidas de v4
- **Altura:** se ve de unos 1,87 m. Se escaló por la pierna para que los pies apoyen.
- **Dedos:** siguen fusionados en la malla. Solo se marcaron los surcos.
- **Varillas del generador:** quedan unas varillas finas en muñecas y manos.
- **Camiseta:** sin simulación de tela; se deforma por pesos.

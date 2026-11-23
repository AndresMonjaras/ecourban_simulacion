# Candidatos de persona EcoUrban con rig Mixamo (para la animación procedural de la app)

La app anima a la persona con `PERFIL_ACTION_SUIT` (`src/escena/perfilRigPersona.ts`). Ese perfil usa los 67 huesos Mixamo de `public/models/persona-articulada.glb`. Aquí están los candidatos para sustituir al hombre de traje por el integrante de EcoUrban: camiseta blanca con raglán azul, short oliva, gorra negra con emblema verde y tenis blanco/rojo.

**Estado:** ninguno está integrado en la app. `src/` no se modificó para esto.

| Carpeta | Enfoque | Estado |
|---|---|---|
| `ropa_ecourban_v1/` | Recolorear la textura del traje y añadir gorra. GLB en `public/models/persona-articulada-ropa-ecourban-v1.glb`. | Descartado: el traje seguía visible. |
| `integrante_v2/` | Malla v8 retargeteada con LBS + warp TPS. GLB en `public/models/persona-articulada-integrante-v2.glb`. | Descartado: hombros altos y brazos deformes. |
| `integrante_v3_codigo/` | Avatar modelado desde cero por código alrededor del esqueleto Mixamo. Incluye el **visor aislado** (`visor/`). | Proporciones correctas, pero le faltan los detalles. |
| **`integrante_v4_generado/`** | **El modelo del agente generador 3D, intacto** (ropa, cuerpo y textura), con rig Mixamo ajustado a su pose T. Correcciones de hombros, codo, manga, surcos de los dedos y mancha azul de la textura. | **Candidato vigente**, aprobado visualmente en el visor. |

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

## Para integrarlo en la app (pendiente, requiere editar `src/`)
1. Copiar `integrante_v4_generado/persona-articulada-integrante-v4.glb` a `public/models/`.
2. Crear en `perfilRigPersona.ts` un perfil como `PERFIL_ACTION_SUIT`, pero con:
   - `urlModelo` apuntando al nuevo GLB;
   - `alturaCaderaReposo: 0.9795`, porque el reposo del rig es la pose T del modelo, no la pose A del traje.
3. Revisar el peso en web. El GLB tiene 832 mil vértices y 68 MB; conviene una versión decimada con compresión Draco o meshopt.

## Limitaciones conocidas de v4
- **Altura:** se ve de unos 1,87 m. Se escaló por la pierna para que los pies apoyen.
- **Dedos:** siguen fusionados en la malla. Solo se marcaron los surcos.
- **Varillas del generador:** quedan unas varillas finas en muñecas y manos.
- **Camiseta:** sin simulación de tela; se deforma por pesos.

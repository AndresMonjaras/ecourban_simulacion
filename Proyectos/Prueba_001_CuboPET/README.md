# Prueba 001 — Cubo PET

Primera simulación estructural reproducible de BancaPET: cubo sólido paramétrico de 100 mm, cara inferior fija y 500 N descendentes distribuidos como presión sobre la cara superior.

## Estado

Los scripts y el modelo están preparados para FreeCAD 1.1.4, Gmsh 4.15.0 y CalculiX 2.23 incluidos en el AppImage local. Los resultados solo se considerarán válidos después de una corrida real y de revisar sus archivos `.dat` y `.frd`. El material usa propiedades provisionales que no fueron medidas en el lote BancaPET.

## Ejecución

Desde una terminal:

```bash
/mnt/BancaPET/Proyectos/Prueba_001_CuboPET/scripts/ejecutar_simulacion.sh
```

El lanzador aísla `HOME`, `TMPDIR` y XDG bajo `/mnt/BancaPET/.runtime`. Ejecuta la generación CAD, tres niveles de malla y el análisis de resultados. No usa Blender ni Godot.

## Estructura

- `config/caso.json`: unidades, geometría, material provisional, carga y criterios.
- `cad/`: archivo FreeCAD y exportación STEP.
- `scripts/`: macros, wrappers y análisis SVG sin dependencias adicionales.
- `mallas/M1` a `mallas/M3`: archivos de trabajo de Gmsh y mallas exportadas.
- `simulaciones/M1` a `simulaciones/M3`: modelos y salidas crudas del solver.
- `resultados/`: campos nodales CSV, validaciones y convergencia.
- `graficas/`: imágenes SVG creadas desde los resultados obtenidos.
- `evidencias/`: resúmenes y registros por nivel.

## Material provisional

E = 1743.5 MPa procede de un ensayo de compresión de rPET MEX con patrón concentric XY; ν = 0.38 fue un supuesto isotrópico del estudio. ρ = 1380 kg/m³ fue comunicado para una mezcla 65% rPET y 35% PET virgen. Ningún dato caracteriza el lote BancaPET. Fuente: [Mercado-Colmenero et al.](https://ruja.ujaen.es/bitstreams/bf7184ec-e860-49d4-bd8c-d21d9f0f607f/download).

La temperatura de 25 °C y duración de 60 s son metadatos. Este análisis estático no modela creep, viscoelasticidad ni efectos térmicos. El máximo global de von Mises cerca del empotramiento puede reflejar una singularidad de borde.

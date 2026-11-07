# BancaPET — Prueba 002

Banca paramétrica de referencia con 13 objetos `Part::Box` independientes, generados por FreeCAD y editables por cota y colocación. El proyecto se guarda en el disco secundario y reutiliza el visor React Three Fiber y controles de cámara de Prueba 001, en una copia independiente.

## Diseño

- Coordenadas: X a lo largo, Y profundidad (frente positivo), Z altura.
- Unidades CAD: mm. Escala de GLB: metros.
- Asiento: 1500 × 450 mm, altura superior 450 mm, cinco tablones de 82 × 35 mm con huecos de 10 mm.
- Respaldo: 105° con el plano del asiento; cuatro tablones. La elevación de 400 mm implica un vuelo hacia atrás de unos 107 mm, además del espesor de la pieza.
- Soportes laterales y costillas independientes. Las dos costillas se solapan intencionalmente con sus soportes para formar las uniones.
- Caja general verificada: 1500 × 624.79 × 850 mm.

Las dimensiones de los componentes en `componentes.json` informan su caja envolvente después de aplicar su orientación. El diseño es una visualización CAD y no cuenta con análisis estructural ni validación para fabricación.

## Generar CAD

Abrir FreeCAD 1.1.4 y ejecutar `scripts/generar_banca.FCMacro`. Los archivos FCStd, STEP, GLB y JSON se escriben en `cad/` y `modelos/`. Para comprobarlos, ejecutar `scripts/validar_banca.FCMacro` desde FreeCAD.

## Visor

```bash
/mnt/BancaPET/Proyectos/Prueba_002/scripts/iniciar_web.sh
```

Las dependencias de Node se reutilizan mediante un enlace simbólico a Prueba 001; la caché de Vite y las compilaciones de esta prueba quedan en Prueba 002.

Abrir <http://localhost:5174>. El visor mantiene cámara orbital, zoom, paneo, rejilla, ejes y vistas. Haz clic en una pieza para consultar su nombre, ID y dimensiones. El selector permite volver al cubo de Prueba 001.

# Informe final — BancaPET Prueba 002

**Estado: APROBADA** según los criterios funcionales y de entrega de la prueba.

## Resultado

Se generó una banca CAD paramétrica con 13 objetos `Part::Box` editables e identificados: cinco tablones de asiento, cuatro de respaldo, dos soportes laterales y dos costillas inclinadas. El asiento mide 1500 × 450 mm y su cara superior está a 450 mm. El respaldo mide 105° respecto del plano del asiento y alcanza 850 mm de altura total. La caja envolvente verificada es 1500 × 624.79 × 850 mm; la profundidad total incluye el vuelo posterior y las costillas.

El modelo es una referencia geométrica para visualización. No se analizaron cargas ni se validó su seguridad estructural o aptitud para fabricación.

## Colaboración y revisión

- **DeepSeek:** entregó una propuesta para la configuración, la macro de FreeCAD y el exportador GLB. Codex detectó y corrigió la proyección del respaldo y la ubicación de las costillas antes de integrarlas. La versión final se verificó localmente.
- **Agy:** se intentó la revisión externa con la herramienta disponible, pero el servicio respondió `RESOURCE_EXHAUSTED` (HTTP 429, cuota individual agotada). No se atribuye una revisión a Agy. Codex realizó la revisión de alcance, geometría, formatos y visor de forma independiente.

## Validación

- FreeCAD 1.1.4 abrió el FCStd mediante la macro validadora: 13 `Part::Box`, cada uno con un sólido y geometría válida. La validadora cambió temporalmente la cota Length de una pieza, verificó que la forma se regenerara y restauró el valor.
- STEP contiene 13 `MANIFOLD_SOLID_BREP`.
- El GLB tiene cabecera 2.0 válida, un nodo por pieza e IDs coincidentes con CAD y `componentes.json`; la escala se convierte de mm a m.
- Se detectaron solo dos solapes de volumen, ambos previstos: cada costilla con su soporte lateral, de 38 540.74 mm³. No se detectaron otras intersecciones volumétricas.
- `npm run build` pasó TypeScript y compiló Vite. Vite advierte que el bundle supera 500 kB.
- En Chrome con Playwright MCP: GLB, JSON y cubo respondieron HTTP 200; consola sin errores y con dos avisos de dependencias (transformación JSX antigua y `THREE.Clock` deprecado). Funcionan las cuatro vistas, la selección resaltada, sus dimensiones, limpiar selección, restablecer cámara y alternar al cubo y volver.
- La comprobación SHA-256 de los archivos base de Prueba 001 dio `OK` en todos los elementos registrados.
- No se pudo capturar FreeCAD en modo gráfico: Qt informó que falta `xcb-cursor0`. El archivo CAD sí se abrió y validó en FreeCAD en modo sin interfaz.

El informe de geometría reproducible está en `evidencias/validacion-cad.txt`. Las capturas del visor están en `evidencias/`.

## Entregables

- `config/banca.json`: medidas y parámetros centrales.
- `scripts/generar_banca.FCMacro`: genera y guarda el modelo CAD y exportaciones.
- `scripts/exportar_banca.py`: exporta GLB y metadatos por pieza.
- `scripts/validar_banca.FCMacro`: verifica FCStd, piezas, solapes, STEP, GLB e IDs.
- `cad/banca.FCStd`, `cad/banca.step`.
- `modelos/banca.glb`, `modelos/componentes.json`.
- `web/`: copia adaptada del visor R3F de Prueba 001. Las dependencias Node se comparten por enlace simbólico; la caché y `dist/` de esta prueba quedan en su propio directorio.

## Abrir el visor

El servidor de desarrollo quedó disponible en `http://localhost:5174/`. Para iniciarlo después:

```bash
/mnt/BancaPET/Proyectos/Prueba_002/scripts/iniciar_web.sh
```

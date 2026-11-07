# BancaPET — PRUEBA 005: Sistema de cargas, contactos y preparación de simulación estructural

## 1. Misión

Actúa como ingeniero mecánico especializado en análisis estructural, desarrollador de software científico y especialista en aplicaciones web 3D.

Tu misión es ampliar el laboratorio virtual BancaPET para permitir que el usuario coloque personas y objetos con masa sobre una banca, detecte superficies de contacto y genere condiciones de carga verificables.

Debes conectar el editor interactivo con una representación física estructurada.

**Objetivo principal:** transformar una escena visual en una descripción de cargas y contactos que pueda utilizar un solucionador FEM.

No implementes todavía el análisis estructural completo de la banca. Eso corresponde a la Prueba 006.

## 2. Estado previo y dependencias

Los proyectos anteriores están ubicados en:

- `/mnt/BancaPET/Proyectos/Prueba_001/`
- `/mnt/BancaPET/Proyectos/Prueba_002/`
- `/mnt/BancaPET/Proyectos/Prueba_003/`
- `/mnt/BancaPET/Proyectos/Prueba_004/`

Antes de comenzar:

1. Comprueba cuáles existen realmente.
2. Verifica que la Prueba 003 tenga resultados FEM válidos, si ya fue ejecutada.
3. Verifica que la Prueba 004 permita agregar, seleccionar, mover y eliminar objetos.
4. Comprueba que los modelos CAD y GLB conservan identificadores de componentes.
5. Identifica qué código puede reutilizarse.

Si la Prueba 004 no está funcional, detén la implementación y explica qué dependencia falta.

No supongas que una prueba está aprobada únicamente porque existe su directorio.

Crea el proyecto en:

`/mnt/BancaPET/Proyectos/Prueba_005/`

No modifiques los archivos originales de las pruebas anteriores.

## 3. Colaboración entre agentes

Utiliza el flujo de trabajo existente:

**DeepSeek**
- Proponer la arquitectura del sistema de contactos.
- Revisar transformaciones y conversiones de unidades.
- Ayudar a desarrollar el sistema de cargas.

**Agy**
- Revisar el código.
- Comprobar errores de contacto.
- Revisar la coherencia física y matemática.
- Detectar condiciones que puedan producir resultados incorrectos.

**Codex**
- Coordinar las implementaciones.
- Contrastar las propuestas.
- Integrar los componentes.
- Ejecutar pruebas.
- Validar resultados.
- Documentar evidencias.

Si DeepSeek o Agy no están disponibles, continúa mediante revisión independiente y registra esa limitación.

No inventes revisiones ni resultados.

## 4. Almacenamiento obligatorio

Todo debe permanecer en el disco secundario:

`/mnt/BancaPET`

Ruta física:

`/mnt/ollama-data/BancaPET`

Antes de comenzar, verifica el montaje, la escritura y el espacio disponible.

Descargas, cachés, dependencias, compilaciones, archivos temporales y resultados deben permanecer en el disco secundario.

No utilices `sudo`, no instales paquetes globalmente y no modifiques Ollama.

Reutiliza las dependencias ya disponibles.

## 5. Investigación de herramientas existentes

Antes de desarrollar el sistema, investiga herramientas y bibliotecas que puedan facilitar:

- Detección de intersecciones.
- Raycasting.
- Consultas de proximidad entre mallas.
- Transformaciones de coordenadas.
- Identificación de superficies.
- Representación de cargas distribuidas.
- Exportación de condiciones de frontera.

Evalúa especialmente las capacidades de Three.js, React Three Fiber y las herramientas de geometría ya utilizadas.

No incorpores un motor de física de videojuegos como sustituto del análisis FEM.

Puedes utilizar bibliotecas de colisiones para ayudar a identificar contactos geométricos, pero sus resultados no equivalen automáticamente a presiones de contacto estructurales.

Documenta las herramientas y licencias utilizadas.

## 6. Escenario inicial

Utiliza la banca paramétrica de la Prueba 002.

Permite colocar sobre ella:

- Una persona de referencia.
- Un bloque de peso.
- Varios bloques de peso.
- Varias personas.

El usuario debe poder mover los objetos y cambiar sus propiedades.

La aplicación debe identificar qué objetos podrían transmitir cargas a la banca.

## 7. Sistema de masas y fuerzas

Cada persona y bloque tendrá una masa expresada en kilogramos.

Calcula su peso mediante:

\[
F=mg
\]

Utiliza:

\[
g=9.81\ \mathrm{m/s^2}
\]

Por ejemplo:

Una persona de 80 kg genera un peso gravitacional de:

\[
F=80(9.81)=784.8\ N
\]

El resultado debe expresarse en newtons.

No confundas masa con fuerza.

La aplicación debe actualizar el valor cuando cambie la masa.

Para esta prueba considera condiciones estáticas, sin aceleraciones adicionales.

No simules saltos, impactos ni cargas dinámicas.

## 8. Detección de contacto

Implementa detección geométrica entre los objetos y las superficies de la banca.

El sistema debe:

1. Identificar la posición del objeto.
2. Identificar su geometría de contacto.
3. Determinar si existe contacto con una superficie de la banca.
4. Identificar el componente receptor.
5. Calcular o estimar el área de contacto geométrica.
6. Registrar la orientación de la superficie.
7. Determinar si la carga puede transmitirse verticalmente.
8. Detectar objetos suspendidos sin apoyo.
9. Detectar penetraciones geométricas indebidas.
10. Actualizar el contacto cuando el objeto se mueva.

No utilices únicamente la comparación de cajas envolventes para afirmar que existe contacto físico exacto.

Puedes utilizar cajas envolventes para una detección preliminar, pero confirma la geometría mediante métodos más precisos cuando sea necesario.

Establece tolerancias geométricas explícitas.

No inventes áreas de contacto exactas cuando la geometría disponible no permita calcularlas.

## 9. Modelo de contacto de personas

Para la persona de referencia, implementa un modelo simplificado de carga estática sentada.

No asumas que toda la masa corporal se transmite automáticamente por una sola superficie.

Permite definir una fracción de peso transmitida al asiento y, si corresponde, otras fracciones transmitidas a los pies o al respaldo.

Las fracciones deben sumar el 100 % de la carga gravitacional cuando se representen todos los apoyos externos.

Distingue entre:

- Peso corporal total.
- Carga transmitida al asiento.
- Carga transmitida al respaldo, si se modela.
- Carga transmitida al suelo por los pies, si se modela.

Si no existen datos biomecánicos suficientes, utiliza un caso simplificado claramente identificado y configurable.

No presentes una distribución de presiones corporal simplificada como si fuera una medición experimental.

## 10. Distribución de carga sobre el asiento

Cuando un objeto tenga contacto válido con la banca, genera una representación de carga distribuida.

Para una presión uniforme:

\[
p=\frac{F}{A}
\]

Donde:

- p es la presión en pascales.
- F es la fuerza normal aplicada en newtons.
- A es el área de contacto en metros cuadrados.

Si la carga se distribuye sobre varios tablones, calcula la fracción asignada a cada región de contacto mediante un método documentado.

Verifica que la suma de las fuerzas asignadas sea igual a la fuerza total transmitida al asiento.

No distribuyas automáticamente el peso entre todos los tablones si el objeto solo toca algunos.

No utilices únicamente la distancia al centro de la banca para determinar la distribución.

La distribución inicial es una condición de carga aplicada, no el resultado final de esfuerzos internos. Esa redistribución se resolverá en el análisis estructural posterior.

## 11. Visualización de cargas

Amplía la web para mostrar:

- Flechas de fuerza.
- Magnitud de cada fuerza.
- Superficies receptoras.
- Regiones de contacto.
- Componentes afectados inicialmente.
- Masa de los objetos.
- Fuerza gravitacional.
- Fuerza transmitida a la banca.
- Área de contacto.
- Presión media, cuando sea calculable.

Permite activar y desactivar estas visualizaciones.

Utiliza una escala gráfica que no oculte la geometría.

Las flechas deben tener una orientación coherente con la fuerza aplicada.

No utilices colores de esfuerzo von Mises todavía, porque aún no se habrá ejecutado el análisis FEM de la banca completa.

## 12. Panel de cargas

Agrega un panel llamado **Cargas y contactos**.

Debe mostrar una tabla con:

- Objeto.
- Masa.
- Fuerza gravitacional.
- Estado de contacto.
- Componente receptor.
- Área de contacto.
- Fuerza transmitida.
- Presión media, cuando corresponda.

Incluye un resumen de:

- Masa total de los objetos.
- Peso gravitacional total.
- Fuerza total transmitida a la banca.
- Fuerza soportada por otros apoyos.
- Objetos sin contacto válido.
- Advertencias geométricas.

No incluyas cargas suspendidas como fuerzas aplicadas a la banca.

## 13. Edición interactiva

El usuario debe poder:

1. Colocar una persona.
2. Cambiar su masa.
3. Moverla sobre la banca.
4. Observar cómo cambia la región de contacto.
5. Retirarla de la banca.
6. Comprobar que desaparece su carga.
7. Agregar un bloque.
8. Cambiar su masa.
9. Colocarlo en un extremo.
10. Comparar la distribución de cargas aplicadas.
11. Eliminar cualquier objeto.
12. Reiniciar el escenario.

La interfaz debe actualizar los datos sin necesidad de recargar la página.

No ejecutes una simulación FEM completa cada vez que se mueva un objeto.

## 14. Exportación de escenario físico

Genera un archivo estructurado:

`escenario_fisico.json`

Debe contener:

- Versión del esquema.
- Sistema de unidades.
- Identificadores de objetos.
- Referencias CAD.
- Transformaciones.
- Masas.
- Gravedad.
- Contactos.
- Superficies receptoras.
- Áreas de contacto.
- Fuerzas.
- Distribuciones de carga.
- Advertencias.
- Parámetros de aproximación utilizados.

No exportes una carga como válida cuando el contacto sea ambiguo o no esté resuelto.

Incluye referencias estables a las superficies CAD cuando sea posible. No dependas únicamente del índice de triángulos del GLB, porque puede cambiar al exportar nuevamente el modelo.

La salida debe poder utilizarse posteriormente como entrada para preparar un modelo FEM.

## 15. Casos de prueba obligatorios

### Caso A — Banca vacía

Sin personas ni pesos.

Resultado esperado:

- Carga externa de objetos: 0 N.
- Ningún contacto activo.

No confundir este resultado con el peso propio de la banca, que se incorporará en otra etapa.

### Caso B — Persona de 80 kg

Coloca una persona en el centro de la banca.

Resultado esperado:

- Peso gravitacional: 784.8 N.
- Fuerza transmitida a la banca según las fracciones de apoyo configuradas.
- Región de contacto identificada.
- Componentes receptores identificados.

### Caso C — Bloque de 20 kg

Coloca un bloque sobre el asiento.

Resultado esperado:

- Peso gravitacional: 196.2 N.
- Contacto válido si la geometría está correctamente apoyada.
- Carga aplicada sobre la superficie receptora.

### Caso D — Objeto suspendido

Coloca un bloque por encima de la banca, sin tocarla.

Resultado esperado:

- Peso gravitacional calculado.
- Fuerza transmitida a la banca: 0 N.
- Estado: sin contacto.

### Caso E — Carga excéntrica

Coloca el bloque cerca de un extremo de la banca.

Resultado esperado:

- La región de contacto cambia.
- Los componentes receptores se actualizan.
- La fuerza total se conserva.

No inventes reacciones estructurales ni esfuerzos internos.

### Caso F — Varios objetos

Coloca dos personas y dos bloques.

Comprueba:

- Identificadores únicos.
- Contactos independientes.
- Suma correcta de fuerzas.
- Ausencia de duplicación de cargas.
- Actualización al eliminar objetos.

### Caso G — Contacto inválido

Coloca un objeto atravesando parcialmente el asiento.

Resultado esperado:

- Advertencia de penetración.
- El sistema no debe tratar automáticamente ese estado como contacto físico válido.
- El usuario debe poder corregir la posición.

## 16. Validación matemática

Implementa pruebas automatizadas para comprobar:

- Conversión de kilogramos a newtons.
- Conversión de mm² a m².
- Cálculo de presión.
- Conservación de fuerza.
- Fracciones de apoyo.
- Contactos múltiples.
- Eliminación de cargas.
- Objetos suspendidos.
- Detección de penetración.
- Consistencia de unidades.

Utiliza tolerancias numéricas explícitas.

Para las distribuciones de carga, comprueba que la suma de fuerzas coincide con la carga aplicada dentro de la tolerancia definida.

No ocultes errores numéricos redondeando resultados antes de validarlos.

## 17. Arquitectura

Organiza el código separando:

- Geometría y contacto.
- Propiedades de objetos.
- Cálculo de fuerzas.
- Distribución de cargas.
- Estado del editor.
- Visualización de cargas.
- Validaciones.
- Exportación física.

Estructura orientativa:

```text
/mnt/BancaPET/Proyectos/Prueba_005/
├── config/
├── modelos/
├── scripts/
├── web/
│   └── src/
│       ├── components/
│       │   ├── editor/
│       │   ├── loads/
│       │   └── panels/
│       ├── physics/
│       │   ├── contacts/
│       │   ├── forces/
│       │   └── distributions/
│       ├── stores/
│       ├── types/
│       ├── utils/
│       └── pages/
├── tests/
├── resultados/
├── evidencias/
└── README.md
```

No concentres los cálculos físicos dentro de los componentes visuales de React.

Las funciones matemáticas deben poder probarse sin abrir el navegador.

## 18. Verificaciones de navegador

Ejecuta la aplicación y verifica:

- Colocación de personas.
- Colocación de bloques.
- Edición de masas.
- Movimiento de objetos.
- Visualización de flechas.
- Actualización de contactos.
- Panel de cargas.
- Exportación JSON.
- Eliminación de objetos.
- Reinicio de escena.

Utiliza Playwright cuando esté disponible.

Comprueba que las funciones existentes de la Prueba 004 siguen funcionando.

Ejecuta TypeScript, pruebas automatizadas y build.

No declares que una función está verificada si únicamente comprobaste que compila.

## 19. Evidencias

Guarda:

1. Banca vacía.
2. Persona de 80 kg.
3. Bloque de 20 kg.
4. Objeto suspendido.
5. Carga cerca de un extremo.
6. Varios objetos.
7. Flechas de carga.
8. Panel de fuerzas.
9. Contacto inválido.
10. Archivo JSON exportado.
11. Resultados de pruebas automatizadas.

Incluye capturas reales y registros de ejecución.

## 20. Criterios de aprobación

La Prueba 005 será **APROBADA** únicamente cuando:

- El editor de escenarios funcione.
- Las masas se conviertan correctamente en fuerzas.
- Los contactos geométricos se identifiquen.
- Los objetos suspendidos no generen cargas sobre la banca.
- Las penetraciones inválidas se detecten.
- Las cargas se asignen a superficies identificables.
- Se conserve la fuerza total.
- La web visualice las cargas.
- El panel muestre datos coherentes.
- El JSON físico pueda exportarse.
- Las pruebas automatizadas pasen.
- Las pruebas anteriores permanezcan intactas.
- Los archivos permanezcan en el disco secundario.

Si falta algún requisito esencial, declara la prueba PARCIAL o FALLIDA y documenta el motivo.

## 21. Entrega final

Informa:

- URL local de la aplicación.
- Comando para iniciarla.
- Herramientas utilizadas.
- Arquitectura implementada.
- Casos de prueba ejecutados.
- Resultados numéricos.
- Evidencias.
- Rutas de archivos.
- Problemas encontrados.
- Limitaciones físicas.
- Participación real de DeepSeek y Agy.
- Estado final: APROBADA, PARCIAL o FALLIDA.

No avances a la Prueba 006 sin autorización.

## INSTRUCCIÓN FINAL

Esta prueba debe convertir los objetos colocados en el editor en condiciones de carga matemáticamente coherentes.

Prioriza la identificación correcta de contactos, la conservación de fuerzas y la trazabilidad de los datos.

No confundas detección geométrica con resolución física de contacto.

No generes deformaciones ni esfuerzos estructurales inventados.

Ejecuta, verifica y documenta la prueba de principio a fin.

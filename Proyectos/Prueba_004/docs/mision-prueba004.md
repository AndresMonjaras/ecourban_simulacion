# BancaPET — PRUEBA 004: Editor interactivo de escenarios 3D

## 1. Misión

Actúa como arquitecto de software, desarrollador React/TypeScript, especialista en Three.js y diseñador de herramientas CAD interactivas.

Tu misión es transformar el visor web de BancaPET en un editor de escenarios tridimensionales.

El usuario debe poder agregar, seleccionar, mover, rotar, configurar y eliminar objetos dentro de un espacio 3D, utilizando el ratón y una interfaz intuitiva.

El resultado debe ser una aplicación funcional y verificable, no una demostración con botones decorativos.

**No implementes todavía simulación física, deformaciones ni desgaste.**

## 2. Colaboración entre agentes

Utiliza las herramientas disponibles:

**DeepSeek:** propuestas de arquitectura, implementación de interacciones y componentes React.

**Agy:** revisión de código, arquitectura, eventos de interacción, posibles errores y pruebas.

**Codex:** coordinación, integración, ejecución, validación y documentación.

No aceptes automáticamente el código propuesto por otro agente. Comprueba su compatibilidad con las versiones instaladas y con el proyecto actual.

Si un agente no está disponible, continúa y registra la limitación.

No inventes revisiones ni aprobaciones.

## 3. Almacenamiento obligatorio

Trabaja exclusivamente en el disco secundario:

`/mnt/BancaPET`

Ruta física:

`/mnt/ollama-data/BancaPET`

Verifica que el enlace simbólico apunta al disco correcto.

No instales dependencias globales ni utilices sudo.

Redirige cachés, temporales y descargas al disco secundario.

No modifiques los directorios de Ollama.

Preserva las pruebas anteriores:

- `/mnt/BancaPET/Proyectos/Prueba_001/`
- `/mnt/BancaPET/Proyectos/Prueba_002/`
- `/mnt/BancaPET/Proyectos/Prueba_003/`, si ya existe y está implementada.

Crea:

`/mnt/BancaPET/Proyectos/Prueba_004/`

No des por aprobada la Prueba 003 si no existe evidencia de su ejecución.

## 4. Investigación antes de programar

Investiga herramientas open source para evitar reconstruir controles 3D existentes.

Evalúa especialmente:

- React Three Fiber.
- Drei `TransformControls`.
- Drei `OrbitControls`.
- Three.js `Raycaster`.
- Zustand para estado del editor.
- Bibliotecas de gizmos, selección y manipulación 3D compatibles con la arquitectura existente.

Reutiliza las dependencias actuales siempre que sea posible.

No incorpores un editor 3D completo si eso obliga a reemplazar innecesariamente el proyecto existente.

Documenta las herramientas seleccionadas y sus licencias.

## 5. Objetivo principal

Construir un editor donde el usuario pueda:

1. Agregar una banca.
2. Agregar una persona de referencia.
3. Agregar un bloque de peso.
4. Seleccionar cualquier objeto.
5. Moverlo mediante controles 3D.
6. Rotarlo.
7. Modificar sus propiedades.
8. Duplicarlo.
9. Eliminarlo.
10. Guardar el escenario.
11. Recuperar el escenario guardado.
12. Reiniciar el escenario.

El editor debe permitir trabajar con varios objetos al mismo tiempo.

## 6. Biblioteca de objetos

Implementa un panel lateral llamado **Biblioteca**.

Incluye inicialmente tres categorías.

### Estructuras

**Banca PET**

Utiliza el archivo GLB real de la Prueba 002.

No recrees la banca mediante primitivas geométricas.

Conserva la escala, orientación y estructura de componentes.

### Personas

**Persona de referencia**

Utiliza un modelo humano 3D con licencia compatible, si existe uno adecuado.

Si no es posible obtenerlo, utiliza temporalmente un maniquí 3D construido con primitivas geométricas y etiquétalo como provisional.

La persona debe tener una propiedad editable de masa corporal, expresada en kilogramos.

Valor inicial: 75 kg.

No es necesario animar la persona ni sentarla automáticamente todavía.

### Cargas

**Bloque de peso**

Genera un bloque tridimensional que pueda colocarse en cualquier posición válida.

Propiedades iniciales:

- Masa: 20 kg.
- Dimensiones: 200 × 200 × 200 mm.
- Color identificable.
- Identificador único.

La masa será un dato almacenado para futuras simulaciones; todavía no debe producir fuerzas físicas.

## 7. Interacción con el ratón

Implementa una experiencia similar a un editor 3D.

### Clic izquierdo

- Seleccionar un objeto.
- Resaltarlo visualmente.
- Mostrar sus propiedades.
- Deseleccionar al hacer clic en una zona vacía.

### Clic derecho

Abrir un menú contextual sobre el objeto seleccionado.

Opciones:

- Seleccionar.
- Mover.
- Rotar.
- Duplicar.
- Eliminar.
- Ver propiedades.

El menú debe aparecer cerca del cursor, sin salirse de los límites de la ventana.

Evita que aparezca simultáneamente el menú contextual nativo del navegador dentro del área del editor.

### Arrastrar

Permitir mover el objeto seleccionado mediante controles de transformación.

Utiliza un gizmo tridimensional con ejes X, Y y Z.

Durante la manipulación, evita que `OrbitControls` interfiera con `TransformControls`.

### Rueda del ratón

Controlar el zoom de la cámara.

### Navegación

Conservar las funciones actuales de:

- Órbita.
- Paneo.
- Zoom.
- Vista frontal.
- Vista lateral.
- Vista superior.
- Vista isométrica.
- Restablecer cámara.

## 8. Sistema de colocación

Al seleccionar un objeto de la biblioteca, activa un modo de colocación.

El usuario debe poder:

1. Seleccionar el tipo de objeto.
2. Ver una previsualización semitransparente.
3. Mover el cursor sobre el suelo.
4. Hacer clic para colocarlo.
5. Cancelar mediante Escape.

Implementa un plano de suelo como referencia geométrica.

Los objetos deben colocarse respetando su punto de apoyo y su escala.

Evita que aparezcan accidentalmente debajo del suelo.

Permite varias instancias del mismo tipo.

No implementes colisiones físicas reales todavía.

## 9. Panel de propiedades

Al seleccionar un objeto, muestra:

- Nombre.
- Identificador único.
- Tipo de objeto.
- Posición X, Y, Z.
- Rotación X, Y, Z.
- Escala.
- Dimensiones.
- Masa, cuando corresponda.
- Visibilidad.

Los campos deben poder editarse y actualizar el objeto en tiempo real.

Utiliza unidades explícitas:

- Posición y dimensiones: milímetros en la interfaz.
- Geometría del visor: metros.
- Masa: kilogramos.
- Rotación: grados.

Centraliza las conversiones para evitar errores.

No confundas masa con fuerza.

## 10. Jerarquía de objetos

Implementa un panel llamado **Escena**.

Debe mostrar todos los objetos presentes.

Por ejemplo:

```text
Escena
├── Banca PET 01
├── Persona 01
├── Peso 01
└── Peso 02
```

El usuario debe poder seleccionar un objeto desde la lista.

La selección en la lista y en el visor debe permanecer sincronizada.

Cada instancia debe tener un identificador único y estable.

No utilices el índice del arreglo como identificador.

## 11. Persistencia

Permite guardar y cargar el escenario mediante un archivo JSON.

Incluye:

- Versión del formato.
- Objetos.
- Identificadores.
- Tipos.
- Transformaciones.
- Propiedades.
- Referencias a los modelos.
- Configuración de cámara, si resulta conveniente.

Implementa:

- Exportar escenario.
- Importar escenario.
- Reiniciar escenario.

Valida los archivos importados.

No ejecutes código contenido en los archivos JSON.

No permitas referencias arbitrarias a rutas locales del sistema.

La aplicación debe reconstruir correctamente el escenario después de importar el archivo.

## 12. Arquitectura

Utiliza una organización modular.

Estructura orientativa:

```text
Prueba_004/
├── config/
├── modelos/
├── scripts/
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── editor/
│   │   │   ├── scene/
│   │   │   ├── panels/
│   │   │   └── controls/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── types/
│   │   ├── utils/
│   │   └── pages/
│   └── package.json
├── tests/
├── evidencias/
└── README.md
```

Separa:

- Renderizado 3D.
- Estado del editor.
- Manipulación de objetos.
- Biblioteca.
- Selección.
- Transformaciones.
- Persistencia.
- Validación de datos.

Evita concentrar toda la aplicación en `App.tsx`.

Mantén el código legible y adecuado para un desarrollador junior-intermedio.

## 13. Preparación para futuras simulaciones

Cada objeto debe disponer de metadatos que permitan integrarlo posteriormente con el motor FEM.

Define un esquema extensible que pueda almacenar:

- ID del objeto.
- ID del modelo CAD.
- Tipo de estructura.
- Material asignado, si se conoce.
- Masa.
- Transformación.
- Identificadores de componentes.
- Superficies de contacto, cuando estén definidas.
- Referencias a futuras condiciones de carga.

No inventes propiedades mecánicas.

No calcules tensiones ni deformaciones en esta etapa.

No asumas que colocar visualmente un objeto sobre la banca implica que ya existe contacto físico válido.

La arquitectura debe permitir distinguir entre **posición visual** y **condiciones físicas de simulación**.

## 14. Validaciones obligatorias

Realiza pruebas funcionales reales.

### Objetos

- Agregar una banca.
- Agregar dos personas.
- Agregar tres pesos.
- Seleccionar cada instancia.
- Mover un objeto.
- Rotarlo.
- Duplicarlo.
- Eliminarlo.
- Verificar que los demás objetos permanezcan intactos.

### Interfaz

- Clic izquierdo.
- Clic derecho.
- Menú contextual.
- Gizmos de transformación.
- Panel de propiedades.
- Jerarquía de escena.
- Zoom.
- Paneo.
- Vistas predefinidas.
- Cancelación mediante Escape.

### Persistencia

- Guardar el escenario.
- Reiniciar.
- Importar el archivo.
- Comprobar que las posiciones, rotaciones, masas e identificadores se restauran correctamente.

### Integridad

- Verificar que el modelo de banca procede de la Prueba 002.
- Verificar las unidades.
- Verificar que no existen errores relevantes de navegador.
- Ejecutar TypeScript y build.
- Comprobar que las pruebas anteriores no se modificaron.
- Verificar que las dependencias y archivos permanecen en el disco secundario.

Utiliza Playwright para pruebas de navegador si está disponible.

No declares aprobada una función que solamente se haya compilado, pero no probado.

## 15. Evidencias

Guarda capturas de:

1. Editor vacío.
2. Biblioteca de objetos.
3. Banca colocada.
4. Persona y pesos colocados.
5. Objeto seleccionado.
6. Gizmo de movimiento.
7. Menú contextual.
8. Panel de propiedades.
9. Escenario con varios objetos.
10. Escenario restaurado desde JSON.

Guarda también los registros de pruebas y compilación.

## 16. Criterios de aprobación

La Prueba 004 será **APROBADA** cuando:

- El editor funcione en el navegador.
- Los objetos puedan agregarse.
- La selección sea correcta.
- Los objetos puedan moverse y rotarse.
- El menú contextual funcione.
- Las propiedades sean editables.
- Exista una jerarquía de escena.
- Se puedan duplicar y eliminar objetos.
- Se puedan guardar y recuperar escenarios.
- Las unidades sean coherentes.
- No se hayan modificado las pruebas anteriores.
- Todos los archivos estén en el disco secundario.

Si alguna funcionalidad esencial falla, declara la prueba PARCIAL o FALLIDA y documenta el problema.

## 17. Entrega final

Proporciona:

- URL local del editor.
- Comando para iniciarlo.
- Arquitectura implementada.
- Bibliotecas reutilizadas.
- Licencias relevantes.
- Ubicación de archivos.
- Resultados de pruebas.
- Capturas.
- Problemas encontrados.
- Limitaciones.
- Participación real de DeepSeek y Agy.
- Estado final de la prueba.

No avances a la siguiente prueba sin autorización.

## INSTRUCCIÓN FINAL

Construye un editor 3D funcional aprovechando la arquitectura existente.

Prioriza interacciones confiables, organización modular y preparación para simulaciones futuras.

No implementes efectos visuales que aparenten física real.

No declares éxito sin verificar la aplicación en un navegador.

Mantén todo el proyecto en `/mnt/BancaPET`.

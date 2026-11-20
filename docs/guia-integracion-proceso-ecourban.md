# Guía de integración del proceso EcoUrban

## Propósito y alcance

Esta guía define el trabajo futuro para adaptar la experiencia principal de EcoUrban y continuarla con una animación procedural del proceso de fabricación de la banca. La secuencia debe seguir la **“ECOURBAN — Guía técnica y visual del proceso de fabricación de la banca”**, compartida como `ECOURBAN parte tecnica.docx`.

La experiencia conservará la animación existente de la banca y su navegación por scroll. La continuación mostrará las etapas de fabricación en orden, sin editor de escenas, selección de objetos ni controles manuales. La aplicación BancaPET se retiró del árbol activo; este archivo sigue siendo la guía para actualizar la secuencia de proceso.

## Principios de contenido y evidencia

- Representar las diez etapas y los equipos indicados en el documento técnico.
- Distinguir el PET reciclado recibido del compuesto que resulta de mezclarlo con compatibilizante, extruirlo y volverlo a peletizar.
- Indicar que los pellets de entrada son adquiridos a proveedores especializados. No representar a EcoUrban recolectando o reciclando directamente botellas.
- Rotular la secuencia como **proceso propuesto** hasta que el equipo confirme qué operaciones se realizan realmente y cuáles se tercerizan.
- No inventar proporciones, temperaturas, presiones, velocidades, tiempos, tolerancias, dimensiones de moldes, capacidades por turno ni datos de producción.
- Diferenciar datos documentados, objetivos, estimaciones y resultados medidos. No presentar una meta como ensayo, certificación, garantía o desempeño comprobado.
- Los modelos de máquinas y acciones serán ilustrativos mientras no existan modelos CAD, fichas del proveedor o parámetros de operación confirmados.
- Mantener la navegación accesible, el scroll nativo, la reversibilidad de la animación y la alternativa de movimiento reducido y fallback 2D ya existentes.

## Flujo técnico y guion visual

| N.º | Etapa | Entradas y equipo documentados | Acción visual prevista | Salida representada | Límites que deben respetarse |
|---|---|---|---|---|---|
| 1 | Recepción de pellets de PET reciclado | Pellets adquiridos a proveedores especializados | Los gránulos ingresan al área de recepción y quedan preparados para continuar | PET reciclado recibido | No mostrar recolección de botellas por EcoUrban ni atribuirle reciclaje primario propio |
| 2 | Secado del material | Secadora deshumidificadora y secadora de tolva | Los pellets pasan por el secado y llegan a la tolva de alimentación | Material seco y preparado | No indicar porcentajes de humedad, temperatura ni duración |
| 3 | Dosificación | PET reciclado y compatibilizante polimérico | Dos corrientes se dosifican y se combinan antes de la extrusión | Mezcla preparada | No asignar proporciones, fórmulas o masas relativas no proporcionadas |
| 4 | Mezclado y homogenización | Extrusora de doble husillo | Mostrar de forma ilustrativa los dos husillos transportando y mezclando el material con calor | Compuesto fundido y homogéneo | No incluir lecturas numéricas de temperatura, velocidad, presión o tiempo |
| 5 | Peletización del compuesto | Peletizadora | El compuesto sale de la extrusora y se corta en gránulos | Pellets del compuesto con compatibilizante | Identificarlos como compuesto preparado, no como los pellets de entrada; no inventar su receta o color real |
| 6 | Alimentación de moldes | Moldes de acero para asiento, respaldo y soportes | Los pellets del compuesto alimentan moldes separados para los componentes | Moldes preparados para moldeo | No inventar cavidades, dimensiones ni capacidad de molde |
| 7 | Moldeo por compresión | Prensa hidráulica de moldeo por compresión; calor y presión | La prensa cierra sobre el molde y el material adquiere la forma de la pieza | Componentes moldeados | No mostrar valores de presión, fuerza, temperatura o ciclo |
| 8 | Enfriamiento y desmoldeo | Piezas recién moldeadas y sus moldes | El molde se abre y se extraen las piezas | Componentes sólidos separados del molde | No afirmar tiempos, temperatura de salida ni propiedades resultantes no medidas |
| 9 | Acabado y ensamblaje | Equipos de acabado, herramientas de ensamblaje y tornillería de acero inoxidable A2 y A4 | Representar ajustes finales generales y unir soportes, asiento y respaldo de forma progresiva | Banca ensamblada | El documento no detalla herramientas ni operaciones concretas de acabado; no inventar perforaciones, tolerancias, uniones o BOM definitivos |
| 10 | Inspección, limpieza y preparación | Banca ensamblada; revisión, limpieza y preparación para empaque e instalación | Mostrar una revisión visual de dimensión, alineación y uniones, seguida por limpieza y preparación | Producto listo para entrega | No mostrar resultado certificado, conformidad normativa o aprobación de carga sin evidencia |

La salida de la etapa 10 enlazará visualmente con la banca completa de la experiencia. El modelo sirve como visualización; no constituye por sí mismo un plano de fabricación ni valida dimensiones, materiales por componente o resistencia.

## Datos y métricas disponibles

La guía técnica presenta las siguientes especificaciones. Deben mostrarse con su calificador, no como resultados medidos:

| Dato | Valor consignado | Tratamiento en la experiencia |
|---|---:|---|
| PET utilizado por banca | Aproximadamente 45 kg | “Objetivo del proyecto” |
| Capacidad de carga | 250–300 kg | “Objetivo, pendiente de ensayo” |
| Vida útil | 10–15 años | “Estimación, pendiente de validación” |
| Tornillería | Acero inoxidable A2 y A4 | “Material contemplado” |

No se dispone en el documento de resultados medidos de producción, consumo energético, emisiones, ahorro, mermas, ciclo por pieza ni capacidad por turno. Esos valores no deben incorporarse hasta contar con una fuente y método de medición identificables.

### Datos provenientes de BancaPET

La aplicación BancaPET retirada permitía colocar y mover objetos, asignar masas y calcular apoyos mediante geometría aproximada; esta descripción se conserva como antecedente para delimitar qué datos no deben reutilizarse. No era una simulación dinámica ni un análisis FEM. Por tanto:

- El bloque de 20 kg, la persona articulada de 75 kg, posiciones, apoyos permitidos y estados de colocación son datos de configuración o resultados geométricos del editor; no prueban capacidad estructural.
- No reutilizar esos valores como métricas de fabricación, carga certificada o ensayo físico.
- No trasladar la interfaz de manipulación manual a la experiencia principal.
- El GLB de la banca, sus materiales y la documentación de su modelo ya disponibles en `experiencia-ecourban/` pueden seguir utilizándose para la visualización.
- Las dimensiones de un archivo 3D son datos del modelo visual y no deben presentarse como cotas oficiales de manufactura sin confirmación documental.

## Plan de desarrollo por bloques

Los bloques se ejecutarán en orden. Cada bloque debe cumplir sus criterios antes de iniciar el siguiente.

### Bloque 0 — Integrar los recursos necesarios y retirar BancaPET (completado)

**Resultado:** se confirmó que la experiencia principal ya contiene el modelo GLB v2, sus materiales PBR, fuentes Blender y documentación. No importa código desde BancaPET ni necesita las escenas del simulador para funcionar. Se retiró `web/` y su documentación exclusiva; el historial sigue disponible en Git.

**Recursos conservados en la aplicación principal:**

- GLB activo de la banca y recursos necesarios para cargarlo.
- Fuentes Blender, texturas y documentación del modelo.
- Referencias técnicas y visuales que sustentan la experiencia.

**Criterios comprobados:**

- La experiencia principal se mantiene como aplicación independiente en `experiencia-ecourban/`.
- El GLB activo y sus fuentes permanecen dentro de la aplicación aceptada.
- No se retiraron recursos requeridos por la experiencia.
- El README raíz describe únicamente la aplicación que continuará desarrollándose.

### Bloque 1 — Contrato técnico y evidencia

**Trabajo:** convertir las diez etapas en un contrato de contenido estructurado: entradas, equipo, acción, salida, rótulo, fuente y estatus de evidencia. Separar los datos documentados de metas, estimaciones y elementos pendientes.

**Criterios de aceptación:**

- Las diez etapas coinciden con el orden del documento técnico.
- Cada cifra tiene fuente, unidad y calificador.
- No se introducen parámetros ausentes del documento.
- Las acciones no definidas —en especial el acabado— quedan marcadas como generales o pendientes.

### Bloque 2 — Adaptación de la secuencia existente

**Trabajo:** reemplazar los hitos de fabricación actuales que no correspondan a la guía y conservar la sección después de la animación principal de la banca. La animación seguirá gobernada por el progreso de scroll.

**Criterios de aceptación:**

- El orden visual corresponde al flujo de diez etapas.
- El avance, retroceso y salto de scroll producen una pose determinista para el mismo progreso.
- Se conserva la continuidad con la banca y no se altera el recorrido ya aceptado salvo los ajustes necesarios para enlazarlo.
- Los textos visibles mantienen los calificadores de evidencia.

### Bloque 3 — Modelado de maquinaria y estaciones

**Trabajo:** crear modelos conceptuales, sin marcas comerciales, de la secadora deshumidificadora, secadora de tolva, dosificación, extrusora de doble husillo, peletizadora, moldes de acero y prensa hidráulica. Representar también las zonas generales de enfriamiento, acabado, ensamblaje e inspección.

**Criterios de aceptación:**

- Cada equipo se reconoce visualmente por la función descrita en la guía.
- La escala y el detalle se presentan como ilustrativos mientras no haya CAD o ficha del proveedor.
- No aparecen controles con valores numéricos inventados ni etiquetas de fabricantes inexistentes.

### Bloque 4 — Animación procedural de transformación

**Trabajo:** animar el traslado de pellets, secado, dosificación, mezcla, extrusión, corte, alimentación de moldes, prensado, enfriamiento y extracción mediante el sistema de progreso existente.

**Criterios de aceptación:**

- Todas las acciones son reversibles y deterministas con scroll hacia arriba, abajo o saltos de progreso.
- El material de entrada se distingue narrativamente del compuesto peletizado después de la extrusión.
- La prensa representa calor y presión sin atribuirles valores no confirmados.
- Movimiento reducido y fallback conservan la comprensión de las etapas.

### Bloque 5 — Acabado, ensamblaje e inspección

**Trabajo:** enlazar componentes moldeados con una representación general de acabado, ensamblarlos con tornillería inoxidable contemplada y cerrar con inspección, limpieza y preparación para entrega.

**Criterios de aceptación:**

- La banca se ensambla progresivamente y termina en la pose completa de la experiencia.
- La tornillería y geometría se rotulan como visualización conceptual hasta disponer de BOM y planos.
- La inspección no se presenta como certificación o prueba de carga.
- Las operaciones de acabado específicas permanecen genéricas hasta su confirmación.

### Bloque 6 — Métricas y validación visual

**Trabajo:** integrar las cuatro especificaciones de la tabla con sus calificadores y revisar el recorrido en escritorio, móvil, movimiento reducido y fallback 2D.

**Criterios de aceptación:**

- Cada cifra aparece como objetivo, estimación o material contemplado según corresponda.
- No se presentan como reales resultados de BancaPET que solo sean geometría o parámetros de escenario.
- La secuencia no tiene desbordamiento, clipping ni pérdida de información esencial en tamaños móviles.
- La misma posición de scroll reproduce el mismo estado visual.

## Dependencias y preguntas abiertas del equipo

El documento técnico permite definir la secuencia, pero antes de presentar el proceso como operación vigente el equipo debe confirmar:

1. Qué etapas se realizarán dentro de EcoUrban y cuáles dependerán de proveedores.
2. Si compatibilizante, extrusión de doble husillo, peletización y moldeo por compresión son la ruta aprobada y quién la operaría.
3. Qué operaciones concretas componen el acabado.
4. Qué planos, BOM, dimensiones, tolerancias y puntos de unión corresponden a la banca acordada.
5. Qué ensayos respaldarán la capacidad objetivo y la vida útil estimada.
6. Si se generarán mediciones de proceso que puedan publicarse con unidad, método, fecha y responsable.

Hasta resolver estas preguntas, la experiencia debe identificarse como **representación visual del proceso propuesto**.

## Fuentes

- `ECOURBAN parte tecnica.docx`, documento técnico compartido por el equipo, secciones 1–7 y tabla de maquinaria.
- `experiencia-ecourban/README.md`, para arquitectura, animación por scroll, modelo y límites actuales de la aplicación principal.
- Historial Git previo al retiro de `web/`, para la implementación de BancaPET y el alcance de sus datos geométricos.

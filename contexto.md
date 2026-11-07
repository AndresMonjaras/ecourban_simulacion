# Contexto de BancaPET · Prueba 005

**Raíz de este worktree:** `/mnt/ollama-data/BancaPET/Proyectos/ecourban_simulacion-cine`
**Rama de trabajo:** `feature/bancapet-cinematic`
**Estado:** implementación de Prueba 005 con validaciones registradas. Esto no equivale a una aprobación formal de ingeniería ni a resultados FEM.

Este archivo resume el trabajo comprobable y propone una hoja de ruta. Las metas futuras se marcan como propuestas; no son requisitos aprobados. El código y los resultados de esta rama se mantienen en el disco secundario. La última entrega aún no se ha integrado mediante commit o push.

## 1. Propósito y alcance

BancaPET es un editor web 3D para armar un escenario con la banca PET, una persona articulada y bloques con masa. Prueba 005 extiende el trabajo anterior de edición con navegación, selección, colocación y apoyos visuales; también contiene una estimación estática geométrica limitada para los bloques usados en el comercial. La misión de Prueba 005 describe un alcance más amplio de cargas y contactos; sus requisitos no deben confundirse con funciones ya implementadas (`README.md`, `docs/mision-prueba005.md`).

**Límite físico:** no se ha ejecutado un análisis FEM. La caída del objeto es una animación visual y el estimador no calcula impacto, esfuerzos, deformación, presión local ni certificación estructural (`README.md`, `README_VIDEO.md`).

## 2. Historia y decisiones del proyecto

- El registro histórico `docs/verificacion-prerrequisitos.md` describe una evaluación temprana que detuvo el trabajo al encontrar que el gizmo de Prueba 004 no persistía las transformaciones. Ese documento conserva la evidencia de aquella revisión y no describe por sí solo el estado actual del clon.
- La misión histórica de Prueba 005 pidió reutilizar el GLB de la banca y representar cargas estáticas, contactos y superficies receptoras, sin avanzar todavía al análisis estructural completo (`docs/mision-prueba005.md`).
- En solicitudes posteriores, el usuario pidió mantener el trabajo en el disco secundario y consolidar en Prueba 005 los controles de movimiento, manipulación y apilado de objetos, la persona sentada/de pie, el enfoque orbital y la reversión con Ctrl+Z. Esas peticiones son contexto de producto; la implementación actual se describe en la siguiente sección.
- Después el usuario aprobó una extensión cinematográfica de 45 segundos, cinco escenas y cuatro cargas, con un estimador estático de contacto documentado. También proporcionó una pista de música y pidió incluirla como fondo.
- No cambiar la geometría de la banca ni usar valores físicos para disimular errores de postura fueron restricciones de la extensión. La escena cinematográfica usa la banca GLB existente; no se modificaron el GLB ni los módulos de postura.

## 3. Estado implementado

### Editor 3D

El editor permite agregar y seleccionar banca, maniquí y bloques; desplazarse con WASD; mover y aterrizar objetos sobre apoyos geométricos; visualizar a la persona sentada al apoyarla en el asiento y de pie al quitar la banca; y deshacer con Ctrl+Z. No permite apoyar una banca sobre otra y bloquea el movimiento de la banca cuando tiene objetos dependientes. La cámara orbital se encuadra con el centro y dimensiones globales de la banca, tiene amortiguación, presets frontal/lateral/superior/isométrico y controles para centrar la banca o enfocar la selección. Las rutas cinematográficas conservan un despeje respecto de la esfera envolvente de la banca; esa protección conservadora no equivale a detectar todas las obstrucciones mediante raycast (`README.md`, `web/src/App.tsx`, `web/src/components/scene/SceneCanvas.tsx`, `web/src/cinematic/cameraPaths.ts`, `web/src/utils/placement.ts`, `web/src/utils/humanPose.ts`).

### Maniquí articulado

El maniquí provisional está formado por segmentos corporales y articulaciones editables. La postura de pie y la sentada se generan por articulaciones, no rotando el cuerpo completo. Las pruebas de `web/tests/humanPose.test.ts` comprueban proporciones relativas, flexiones de cadera/rodilla y segmentos articulados. La extensión comercial no cambió su geometría ni sus propiedades físicas.

### Estimador estático del comercial

- Extrae caras superiores de los cinco nodos `asiento_01`–`asiento_05` del GLB en coordenadas mundiales.
- Comprueba la huella XY de cada bloque de 200 mm contra los triángulos de asiento en la cota de apoyo; la tolerancia vertical está definida en `web/src/cinematic/staticLoads.ts`.
- Calcula el peso como `masa × 9.81 m/s²` y asigna fuerza por superficie en proporción al área geométrica de solape. Informa advertencias cuando no hay receptor válido.
- Para las masas de demostración de 10, 20, 30 y 40 kg, la escena de resultados muestra 100 kg y 981 N en total. La captura `evidencias/video/capturas/0810-resultados.png` registra aproximadamente 267.1 N en el tablón 02, 446.9 N en el 03 y 267.1 N en el 04; esas partes suman 981 N en ese caso de demostración.
- Esta regla no deriva presión o rigidez ni modela contacto corporal. No cubre una distribución configurable del peso de la persona entre asiento, respaldo y pies, que la misión plantea como objetivo (`docs/mision-prueba005.md`).

### Estudio y comercial cinematográfico

El estudio ofrece reproducir, pausar, reiniciar, cambiar velocidad y saltar entre escenas. La escena de exportación crea la banca y los bloques temporalmente, sin añadirlos al reducer ni persistirlos en `localStorage`. El director usa tiempo absoluto para las escenas de presentación, órbita de 360°, caída ilustrativa, resultados estáticos y cierre (`web/src/components/cinematic/CinematicStudio.tsx`, `web/src/cinematic/`).

El render final está en `evidencias/video/BancaPET_Comercial_005.mp4`. Usa H.264/AAC, 1280×720, 30 FPS, 45 segundos y 1,350 cuadros. La pista que entregó el usuario se conserva en `evidencias/video/audio/musica-fondo.mp4`; el runner mezcla el audio AAC a volumen 18% con fundidos de entrada y salida. Hay capturas de presentación, giros a 90°/180°/270°/360°, pesos, resultados y cierre en `evidencias/video/capturas/`.

## 4. Arquitectura y archivos de referencia

- `web/src/App.tsx`: estado del editor, historial, escena temporal cinematográfica y modo de exportación.
- `web/src/components/scene/SceneCanvas.tsx`: Three.js/React Three Fiber, objetos, controles, extracción del GLB, cámara y overlay técnico/cinematográfico.
- `web/src/utils/placement.ts`, `humanPose.ts`, `cameraFraming.ts`, `cameraNavigation.ts`: apoyo visual, poses, encuadre y desplazamiento.
- `web/src/cinematic/types.ts`, `staticLoads.ts`, `scenes.ts`, `objectAnimations.ts`, `cameraPaths.ts`, `CinematicDirector.ts`: contratos, cálculo geométrico, tiempos y animaciones.
- `scripts/render-video/config.json`, `render-config.mjs`, `render-video.mjs`: configuración, validación y render Playwright + FFmpeg.
- `README.md`, `README_VIDEO.md`, `docs/mision-prueba005.md`, `docs/verificacion-prerrequisitos.md`: guía y fuentes históricas; leer cada una según su fecha/propósito, no como un único estado simultáneo.

## 5. Validación comprobada

En este worktree se registraron:

- `cd web && npm test`: 49 pruebas aprobadas, incluyendo las pruebas previas y las de cámara, director, contacto y postura.
- `cd web && npm run test:video`: 3 pruebas aprobadas para resolución, duración, FPS y número de cuadros.
- `cd web && npm run build`: TypeScript y Vite terminaron correctamente. Vite puede advertir que el bundle principal supera 500 kB.
- Firefox abrió tanto la app normal como `?cinematic=export`. Se comprobó la previsualización y que activar el estudio no alteró el escenario de `localStorage`.
- `ffprobe` registró video H.264 y audio AAC estéreo, 1280×720, 30 FPS, 1,350 cuadros y 45 segundos. FFmpeg decodificó el archivo completo sin errores; `volumedetect` confirmó señal de audio no nula.
- Evidencia visual en `evidencias/video/capturas/`; log de FFmpeg en `evidencias/video/ffmpeg.log`.

La resolución final se dejó en 720p porque el render secuencial de 1,350 capturas con Firefox tarda varios minutos en este equipo. No se hizo commit ni push de esta extensión.

## 6. Deudas, límites y discrepancias conocidas

1. `README_VIDEO.md` dice que `npm run test:video` ejecuta dos pruebas, pero la configuración actual y la ejecución final registran tres. Actualizar ese contador cuando se revise el README.
2. La verificación histórica identifica que `soporte_01` y `soporte_02` no son nombres del GLB; el GLB usa `soporte_izquierdo` y `soporte_derecho` además de otros componentes. El escenario aún contiene esas referencias antiguas como metadatos (`docs/verificacion-prerrequisitos.md`, `web/src/App.tsx`). No tratarlas como identificadores CAD válidos hasta corregirlas y verificarlas contra el modelo.
3. El estimador y su overlay se construyeron para bloques del comercial. La misión también habla de cargas de personas, superficies, exportación física y distribución de presiones; no afirmar que esos requisitos más amplios ya estén resueltos.
4. El runner depende de Firefox en caché y FFmpeg/ffprobe instalados localmente. La ruta de Firefox configurada corresponde a este entorno; no es todavía portable a cualquier equipo (`scripts/render-video/render-video.mjs`).
5. Los apoyos del editor se basan en geometría y envolventes simplificadas. No son una solución dinámica de colisiones ni certifican ausencia de toda penetración malla-a-malla (`README.md`).
6. No hay aprobación formal de ingeniería documentada. Las pruebas y el video validan la implementación indicada, no la seguridad estructural de la banca.

## 7. Metas futuras propuestas

Estas metas son sugerencias para priorizar con el usuario; no están autorizadas automáticamente por estar en este archivo.

1. **[Propuesta] Normalizar identificadores CAD:** sustituir metadatos de componente inválidos y añadir una verificación automatizada que compare `componentIds` con nodos reales del GLB.
2. **[Propuesta] Extender contactos a personas:** definir y documentar fracciones configurables de carga corporal entre los apoyos presentes, conservando el equilibrio de fuerzas y sin presentarlas como datos biomecánicos medidos.
3. **[Propuesta] Completar el reporte físico de Prueba 005:** visualizar masas, receptores, áreas y fuerzas por objeto/superficie; exportar un esquema JSON versionado con unidades e IDs trazables, solo después de acordar su contrato.
4. **[Propuesta] Aumentar cobertura geométrica:** validar bloques rotados, contactos múltiples, huecos, tolerancias y apoyos en otros componentes; agregar evidencia de que las fuerzas transmitidas y no transmitidas conservan el balance.
5. **[Propuesta] Hacer portable la exportación audiovisual:** detectar/configurar Firefox y FFmpeg por opciones del runner, y permitir elegir resolución/bitrate sin cambiar la duración determinista.
6. **[Propuesta] Prueba 006:** implementar FEM con condiciones de frontera verificadas, malla convergente y resultados reproducibles como una etapa aparte. No se ha comenzado aquí ni forma parte de la prueba visual actual.

## 8. Colaboración y trazabilidad

La regla del proyecto es que Codex conserva la responsabilidad final, revisa cambios y ejecuta las verificaciones; DeepSeek puede proponer y Agy auditar (`docs/mision-prueba005.md` y las instrucciones del proyecto). Para la escritura de este contexto, DeepSeek, consultado mediante OpenCode, revisó el esquema y señaló discrepancias que Codex contrastó contra el worktree. Después el usuario pidió usar DeepSeek desde Google Chrome con una extensión. El perfil Chrome inspeccionado no incluye una extensión DeepSeek y la herramienta de pestañas de Playwright se quedó colgada; por eso no se hizo una segunda consulta desde navegador. Codex intentó la revisión documental de Agy, pero el CLI devolvió cuota individual agotada (HTTP 429); por ello Agy no entregó observaciones. Ninguna salida de agente reemplaza la verificación de archivos y comandos por Codex.

Fuentes de estado actual: `README.md`, `README_VIDEO.md`, código y pruebas listados arriba, capturas y MP4. Fuente de objetivos originales: `docs/mision-prueba005.md`. Fuente de la evaluación temprana: `docs/verificacion-prerrequisitos.md`. Plan y ledger de la extensión cinematográfica: `docs/superpowers/plans/2026-11-07-bancapet-video-cinematografico.md` y `.superpowers/sdd/2026-11-07-bancapet-video-cinematografico/progress.md`.

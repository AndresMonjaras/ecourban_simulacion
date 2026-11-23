# Integrante EcoUrban v4: modelo generado intacto con rig Mixamo

**Candidato aislado:** `modelos/persona-piloto/integrante_v4_generado/persona-articulada-integrante-v4.glb` (68 MB, 832 005 vértices).

- No está en `public/models/` ni integrado en la app.
- No se tocó `src/`.
- El GLB generado de `~/Descargas` está intacto (sha256 en `verificacion.txt`).
- Sin commit ni push.

## Idea
Se conserva **tal cual** el modelo del agente generador 3D: malla, UV, normales, ropa, cuerpo y textura. Solo se le añade un esqueleto.

- **Esqueleto:** los 67 huesos Mixamo de `persona-articulada.glb`, con los mismos nombres, padres y orden de joints. Así la app lo anima con el mismo mapa de huesos de `PERFIL_ACTION_SUIT`.
- **Pose de bind:** la pose T del propio modelo. Las articulaciones se midieron sobre su anatomía (secciones de brazo, pierna y torso), así que en reposo **ningún vértice se mueve**.
- **Cambios a la malla:** solo dos. Se horneó la rotación de su nodo y se aplicó una escala uniforme de 1,9646. La escala hace que la pierna (cadera a tobillo) mida lo mismo que la pierna canónica de la animación. Así los pies apoyan al caminar y al sentarse en la banca.
- **Inclinación de la columna:** la cadena columna → cuello → cabeza copia la inclinación de cada segmento del rig original. La app orienta los huesos por dirección; sin esto, la cabeza quedaba mirando hacia arriba.
- **Hombros, brazos y manga (revisión 3):**
  - **Codo:** estaba en x=0,29, dentro del antebrazo, así que el brazo superior medía 0,35 m y el antebrazo 0,19 m. Se reubicó en x=0,255, en el pliegue y el olécranon del modelo. Ahora miden 0,245 y 0,258 m en la app (canónico: 0,27 y 0,25), y el brazo ya no se ve largo.
  - **Pivote del brazo:** queda en x=0,13, 1,5 cm bajo la línea central. Más bajo, el casquete del hombro colgaba como parte del brazo y lo alargaba.
  - **Clavícula:** arranca en y=0,76. El trapecio la sigue en un 85 %.
  - **Hombro:** la transición clavícula → brazo se reparte sobre el deltoides y termina antes del dobladillo de la manga. El hombro se ve redondeado, sin aspecto de hombrera.
  - **Manga:** con el brazo doblado sigue completa al brazo, sin quedarse atrás.
  - Parámetros (unidades del modelo, variables de entorno): `ARM_X=0.130`, `ARM_DROP=0.015`, `SH_Y=0.760`, `SH_W=0.85`, `SA_ANCHO=0.035`, `SA_TOP=0.005`, `CODO_X=0.255`.
- **Textura del brazo (revisión 3):** el modelo generado traía azul de la manga pintado sobre la piel del brazo izquierdo: unas tiras largas de una isla UV de la manga que se extienden sobre el brazo. Se veía como una mancha que «estiraba» la manga al doblar el brazo. `scripts/textura.py` corrige solo los téxeles azulados de la piel del brazo más allá del dobladillo:
  - el dobladillo se detecta por lado (izq. 0,198, der. 0,208);
  - los téxeles se rellenan con la piel vecina y, si no hay vecina, con el tono medio del brazo.
  Ver `capturas/brazos_textura_limpia.png`.
- **Manos (revisión 2):** los dedos vienen fusionados en la malla (una «manopla» con surcos poco profundos; solo el pulgar está suelto). `scripts/manos.py` actúa solo sobre los vértices de las manos:
  - hunde los surcos reales entre dedos (por encima de un umbral, para no realzar ruido);
  - los oscurece con color de vértice (`COLOR_0`, oclusión);
  - la topología y la UV no cambian.
  Los dedos se leen separados, aunque siguen unidos en la geometría.
- **Pesos:** se asignan por región (torso, brazos, piernas, cabeza) y por posición a lo largo de cada cadena, con transiciones suaves en hombro, codo, muñeca, cadera, rodilla y tobillo. Las manos del modelo vienen fusionadas, así que siguen al hueso `Hand`.
- **Texturas:**
  - El base color se reencodificó a JPEG q92 a su resolución 4K original.
  - El normal map y el metal/rugosidad se reencodificaron a PNG 2K.
  - Se pasó de 31 MB a 6 MB. Con 31 MB el navegador tardaba demasiado en decodificarlas.
  - Las texturas originales siguen en la fuente.

## Validación (`verificacion.txt`)
- **Carga:** GLTFLoader carga sin errores.
- **Esqueleto:** tiene 67 huesos con nombres, padres y orden idénticos al rig original.
- **Pesos:** suman exactamente 1, sin negativos, NaN ni índices fuera de rango.
- **Rotación por hueso:** se rotaron 13 huesos. Cada uno mueve su región, de forma simétrica entre izquierda y derecha y sin valores no finitos. Al restaurar el reposo, el residuo es 0.
- **Poses reales de la app:** se usaron `animacionPersona.ts` y `adaptadorRigPersona.ts` sin modificar, con `alturaCaderaReposo` 0,9795.
  - Se probaron de pie, marcha A y B, sentándose y sentado.
  - No hay vértices no finitos.
  - La suela queda entre −0,012 y 0,027 m.
- **Visor aislado (Chrome headless vía CDP):** el modelo camina, gira y se sienta en la banca oficial. La consola no muestra errores.

## Capturas (`capturas/`)
- `poses_app_v4.png`: render propio por puntos de las poses de la app, de frente y de perfil.
- `visor_v4_p0.3.png`, `visor_v4_p1.png`: visor web (revisión 3).
- `primer_plano_v4.png`: torso y brazos de pie, en marcha y sentado (revisión 3).
- `manos_antes_despues.png`: mano izquierda antes y después (dorso, palma y frente).

## Limitaciones y para integrar
- **Reposo distinto del original:** el reposo de los huesos es la pose T del modelo, no la pose A del traje. Para usarlo en la app hace falta un perfil propio con `alturaCaderaReposo: 0.9795`. Eso implica editar `perfilRigPersona.ts`, que no se tocó.
- **Altura:** se ve de unos 1,87 m en la app, frente a 1,76 m del original. Es la consecuencia de igualar la pierna canónica: el modelo tiene piernas proporcionalmente cortas. Si se prefiere 1,76 m, habría que reducir la escala y aceptar que los pies no lleguen bien al suelo.
- **Hombros:** son un compromiso del skinning lineal desde la pose T. Si se bajan más, la manga se abre; si se bajan menos, los hombros suben. La camiseta no tiene simulación de tela: la manga y el costado se deforman por pesos.
- **Dedos:** siguen unidos en la geometría. Se marcaron los surcos, pero separarlos de verdad exigiría remodelar la mano (en Blender o regenerando el modelo con los dedos abiertos). No se articulan.
- **Varillas del generador:** quedan unas varillas finas (≈1 cm) en muñecas y manos, y algunas marcas en el dobladillo de la camiseta. Vienen del modelo generado, pegadas a la malla. No se quitaron porque no se pueden aislar con seguridad por código sin dañar la superficie.
- **Tela:** La camiseta y el short se deforman por pesos, sin simulación de tela.
- **Peso del archivo:** 65 MB, casi todo geometría de alta resolución. Para producción convendría:
  - una versión decimada (por ejemplo, de 100 a 150 mil vértices) que conserve la textura;
  - compresión Draco o meshopt.

## Reproducir
```
cd scripts
python3 -I rig_generado.py "<modelo_generado.glb>" v4_full.glb
python3 -I texturas_web.py v4_full.glb ../persona-articulada-integrante-v4.glb 2048
# validación: copiar verify_v4.mjs y poses_app_v4.mjs a experiencia-ecourban/ y ejecutarlos con node (CADERA=0.9795)
```
El visor está en `../integrante_v3_codigo/visor` (selector «Integrante v4», que es el predeterminado). Índice de todos los candidatos: `../CANDIDATOS_RIG_MIXAMO.md`.

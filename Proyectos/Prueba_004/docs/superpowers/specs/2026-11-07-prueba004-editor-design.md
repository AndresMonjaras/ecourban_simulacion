# Diseño — BancaPET Prueba 004

## Intención

Convertir la experiencia visual de Prueba 002 en un editor 3D local para colocar varias bancas, personas de referencia y bloques de peso. El editor prepara escenarios con unidades y metadatos claros para futuras etapas, sin ejecutar cálculos físicos.

## Objetivos

- Cargar la banca auténtica de Prueba 002 y preservar su jerarquía de nodos GLB.
- Agregar, seleccionar, colocar, mover, rotar, duplicar, ocultar y eliminar instancias.
- Exponer propiedades en unidades cómodas y sincronizar visor, árbol y paneles.
- Importar y exportar escenarios JSON versionados y validados.
- Mantener todos los artefactos de la prueba bajo `/mnt/BancaPET/Proyectos/Prueba_004/`.

## Límites

- No se implementan FEM, colisiones físicas, materiales mecánicos, fuerzas, deformaciones, desgaste ni animación humana.
- La persona es un maniquí de primitivas, claramente provisional, con masa editable.
- Las posiciones y transformaciones son visuales; ninguna ubicación crea una condición física de contacto.
- Pruebas 001, 002 y 003 quedan fuera de los cambios.

## Estado encontrado

Prueba 002 usa React 19, TypeScript 5.9, Vite 8, React Three Fiber 9.8.2, Drei 10.7.9 y Three.js 0.187.0. Tiene controles Z-up, GLB de banca y cámara orbital. Prueba 003 no existe en `/mnt/BancaPET/Proyectos/`.

## Enfoques evaluados

1. **Elegido: R3F + Drei TransformControls/OrbitControls + estado con reducer de React.** R3F resuelve selección con los eventos de puntero y raycasting de Three; Drei ya contiene TransformControls y pausa OrbitControls al arrastrar. Un reducer central conserva una fuente única para escena, propiedades y jerarquía. No requiere incorporar un editor entero ni instalar otro paquete.
2. **Zustand + los mismos controles Drei.** Zustand simplificaría selectores globales si la escena creciera mucho, pero hoy no es una dependencia declarada y la prueba objetivo tiene pocos objetos simultáneos. Se evita añadirla para mantener el conjunto de dependencias existente.
3. **Gizmo propio con Raycaster y plano de arrastre.** Evita el control Drei, pero obliga a reconstruir selección de ejes, arrastre y sincronización con la cámara; aumenta riesgos sin aportar una capacidad necesaria.

## Llamadas de implementación

- Coordenadas de Three y estado: metros, ejes X/Y/Z y ángulos en radianes; interfaz: mm y grados; masa: kg. Conversores comunes en `src/utils/units.ts`.
- Colocación: previsualización translúcida con el origen apoyado en plano Z=0; clic confirma y Escape cancela. La transformación mantiene Z de apoyo en cero o superior.
- Escena: `useReducer` y estado serializable, con `crypto.randomUUID()` como ID estable. El render 3D sólo convierte el modelo permitido por su `modelId` conocido.
- Banca: copia binaria del GLB real de Prueba 002. Persona: primitivas con etiqueta provisional. Peso: caja inicial de 200 mm y 20 kg.
- Persistencia: JSON con `version: 1`, metadatos de unidades y modelos permitidos; lectura valida versión, tamaño, tipos, IDs, valores finitos y referencias permitidas antes de actualizar estado. El importador nunca resuelve rutas locales ni ejecuta contenido.
- Guardar conserva una copia en localStorage y exporta un archivo JSON mediante acción explícita del usuario; importar usa un selector de archivo. Reiniciar vacía el escenario.
- Los metadatos físicos contienen listas vacías de materiales, contactos y cargas; `visualOnly: true` separa colocación visual de condiciones futuras.
- Código de nivel junior-intermedio, nombres descriptivos y comentarios breves en español para unidades, eventos y reglas no obvias.

## Herramientas y licencias

- React, React Three Fiber, Drei y Three.js ya están instalados; sus repositorios declaran licencia MIT.
- Drei `TransformControls` está implementado sobre `three-stdlib` y desactiva temporalmente los controles por defecto mientras se arrastra. Fuente: https://github.com/pmndrs/drei/blob/master/src/core/TransformControls.tsx
- Los eventos de R3F usan el raycaster de Three; fuente API de raycasting: https://threejs.org/docs/#api/en/core/Raycaster
- Repositorios y licencias: https://github.com/pmndrs/react-three-fiber, https://github.com/pmndrs/drei, https://github.com/mrdoob/three.js
- Zustand se evaluó, pero no se seleccionó ni se agrega como dependencia.

## Criterio de finalización

El editor sólo se declara APROBADO tras build y TypeScript, pruebas de utilidades, flujo de navegador para biblioteca/colocación/transformación/menú/propiedades/duplicar/eliminar y round trip real del archivo JSON; además se comprueba que Pruebas 001 y 002 conservan sus huellas y que los artefactos están en el disco secundario.

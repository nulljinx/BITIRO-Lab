# BITIRO Lab v7.7 — Simulator-first Coding Workspace

## Objetivo
Dar más espacio al simulador integrado y mover el editor a una zona cómoda debajo de la escena en escritorio, evitando que mapa y código compitan por ancho.

## Cambios
- En escritorio, el simulador pasa a ocupar todo el ancho disponible.
- El editor Monaco se mueve debajo del simulador y también usa todo el ancho.
- El editor mantiene guardado local/cloud, revisión, ejecución, diagnósticos, API/guía y descarga `.ino`.
- Tablet conserva la experiencia por pestañas para no generar una página excesivamente larga.
- La vista de simulador sigue siendo la vista inicial en superficies reducidas.
- El modo `Ocultar código` sigue disponible para concentrarse exclusivamente en la pista.
- Pantalla completa del simulador y pantalla completa del laboratorio siguen disponibles.

## Resaltado IROH
Las funciones de la API IROH disponibles para la sesión se reconocen como llamadas exactas y se muestran en naranja dentro de Monaco. Ejemplos: `avanzar()`, `detenerse()`, `leerDistanciaSonar()` o `moverServoGolpe()`.

- Solo se colorea un nombre exacto de función admitida seguido de `(`.
- Una función mal escrita no recibe el color IROH.
- La revisión/ejecución sigue siendo la fuente de diagnósticos: el color por sí solo no afirma que el programa completo sea válido.
- Los keywords de C++ usan ahora otro tono para distinguirse mejor de las funciones propias de IROH.

## Archivos principales
- `src/features/simulator/Simulator.tsx`
- `src/features/code-editor/CodeEditor.tsx`
- `src/styles/workspace-advanced.css`
- `src/styles/laboratory.css`

## Referencias de interacción consideradas
Se priorizó un gran espacio visual para la simulación y un área de código independiente. Como referencia de patrón, Tinkercad Circuits documenta un gran workspace visual como elemento principal, y Wokwi separa/organiza simulación, editor y paneles de depuración según la tarea. La implementación BITIRO adapta esos patrones al flujo educativo propio del IROH en lugar de copiarlos literalmente.

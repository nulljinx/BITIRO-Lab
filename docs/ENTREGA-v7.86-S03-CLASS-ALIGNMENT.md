# BITIRO Lab v7.86 — S03 Class Alignment

## Objetivo

Alinear la Sesión 03 del simulador con `ROB-002-S03-Slide-2025`: contadores, ciclo `while`, seguidor de línea con tres sensores, sonar, LCD, Golpe e intersecciones con cambio de sentido de 180°.

## Cambios

- Referencia del mentor reescrita con estructuras trabajadas en S03.
- `setup()` queda reservado a inicializaciones.
- `sensorI`, `sensorC`, `sensorD` y `distancia` se declaran sin asignar `0`, porque se leen antes de usarse.
- El contador parte explícitamente en `0` y usa `contadorObstaculos++`.
- `while` evita contar varias veces el mismo obstáculo mientras permanezca frente al sonar.
- Se elimina de la referencia la recuperación avanzada `ultimoGiro`, `const` y estados auxiliares que no son necesarios para el contenido de la sesión.
- Las intersecciones del escenario son suficientemente anchas para representar el caso `NEGRO-NEGRO-NEGRO` con los tres sensores.
- Los tres obstáculos fijos se ubican en el tramo de prueba compatible con los giros de 180°, aprovechando que la guía permite disponerlos libremente.
- S03 reutiliza la calibración de tres sensores de S02 y vuelve a la vista 3D al salir.
- Telemetría S03: L/C/R, sonar, servo Golpe y LCD. Se ocultan IR y pulsador porque no participan en el desafío.
- El sonar solo muestra distancia mientras el programa está ejecutándose.

## Verificación funcional

La referencia S03 fue ejecutada sobre el motor del simulador y completó los cuatro criterios:

- seguidor con tres sensores;
- 3 obstáculos detectados;
- LCD con total `3`;
- 3 respuestas de intersección con giro de 180°;
- sin doble conteo de obstáculos.

También se volvió a ejecutar la referencia de S01 y las tres variantes de S02 para comprobar regresiones.

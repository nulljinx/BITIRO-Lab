# BITIRO Lab v7.34 — Sonar visible solo mediante el programa

## Objetivo
Evitar que la telemetría entregue directamente la distancia del sonar y quite al estudiante la necesidad de leer y mostrar el sensor con su propio código.

## Cambios
- El panel lateral de Sonar ya no muestra la distancia numérica en vivo.
- El valor sigue existiendo internamente y `leerDistanciaSonar()` lo entrega al programa.
- Para ver la distancia, el estudiante debe escribirla en la LCD mediante su código.
- La detección de obstáculos de la misión solo se registra cuando el programa realmente llama a `leerDistanciaSonar()`.
- El feedback ya no revela la distancia exacta fuera de la LCD.

## Intención pedagógica
El simulador deja de exponer la respuesta del sensor por adelantado: el alumno debe leer el sonar, guardar/usar su valor y decidir si quiere mostrarlo en la LCD.

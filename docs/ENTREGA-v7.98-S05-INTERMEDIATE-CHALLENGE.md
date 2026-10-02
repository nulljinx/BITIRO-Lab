# BITIRO Lab v7.98 — S05 Intermediate Challenge

## Alcance

- S05 pasa a ser una sesión interactiva basada en `Copia de ROB-002-S05-plotter-100x200(1).pdf`.
- Pista 100 × 200 cm con base roja, gap, recorrido sinuoso, intersección principal y Bases 1, 2 y 3.
- Telemetría: L/C/R, pulsador común, IR izquierdo/derecho y LCD.
- Reutiliza la calibración de tres sensores de S02–S04.

## Desafío

1. Contar activaciones del IR derecho y mostrarlas en LCD.
2. Usar `while` como antirrebote para una activación mantenida.
3. Comenzar el recorrido cuando se activa IR izquierdo.
4. Seguir línea con tres sensores y atravesar el gap.
5. Detenerse en la intersección y esperar una nueva activación de IR izquierdo.
6. Elegir Base 1 con una activación, Base 2 con dos y Base 3 con tres o más.
7. Detenerse en la base final.

## Validación local del núcleo

La solución de referencia del mentor fue ejecutada contra el núcleo del simulador en cuatro escenarios: 1, 2, 3 y 4 activaciones del IR derecho. Los cuatro completan 4/4 objetivos y el caso 4 termina en Base 3.

Nota de fuente: la pauta de la diapositiva menciona una segunda espera en una intersección, mientras que la consigna principal y el plotter muestran una intersección de elección y luego la franja de base final. La simulación sigue la consigna principal y la geometría del plotter, sin inventar un segundo cruce independiente.

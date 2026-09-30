# BITIRO Lab v7.79 — S01 Pedagogical Mentor Code

## Cambio principal

La referencia docente de S01 se reescribió para reflejar la estructura enseñada en la sesión:

- `setup()` se usa solo para inicializar las partes del IROH.
- La lectura de los sensores IR ocurre dentro de `loop()`.
- La decisión inicial se guarda con `int lado` y `int flag`.
- Se evita `bool`, funciones auxiliares propias, `return` y comparaciones booleanas indirectas.
- El seguidor de línea queda explícito con `if/else`, sensor central y umbral.
- El movimiento del mecanismo Golpe queda expresado como una sub-tarea visible.

## Alcance

Esta entrega cambia la referencia docente, no la geometría de la pista de S01. La revisión pedagógica de la posición del obstáculo y del criterio final del desafío queda separada para no mezclar cambios de código con cambios físicos del escenario.

# BITIRO Lab v7.42 — CI test fixture fix

## Motivo
La primera ejecución de `pnpm verify` detectó una regresión en una prueba de `IrohRuntimeAdapter`. La prueba esperaba que el IR izquierdo estuviera activo, pero no preparaba ese estímulo en el estado del simulador.

## Corrección
- El test `line, IR and sonar read the current scene` ahora activa explícitamente el IR izquierdo antes de ejecutar el programa.
- Se añadió un test complementario que comprueba que los lectores IR permanecen inactivos mientras el estímulo no haya sido activado.
- No se modificó el runtime: el fallo estaba en el fixture del test, no en la lógica de producción.

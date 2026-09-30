# BITIRO Lab v7.23 — Programming language expansion

## Objetivo
Acercar el lenguaje aceptado por el simulador a la forma en que los estudiantes escriben C++/Arduino, manteniendo el runtime seguro y acotado.

## Cambios
- Declaraciones múltiples del mismo tipo separadas por comas:
  - `int si, sc, sd;`
  - `int a = 1, b = 2, c = a + b;`
  - `const int UMBRAL_I = 210, UMBRAL_C = 225, UMBRAL_D = 238;`
- Funcionan en ámbito global, local y en inicializadores `for`.
- Se verificó y reforzó el soporte existente de funciones propias:
  - `void` e `int/long/float/bool`
  - parámetros múltiples
  - `return`
  - llamadas a funciones definidas antes o después de `setup()` / `loop()`
- Se añadió `continue;` dentro de `for` y `while`.
- La Guía muestra un ejemplo claro de variables múltiples y funciones propias.
- Se agregaron pruebas de parser e intérprete para estas construcciones.

## Seguridad / límites conservados
- Sin acceso a `window`, `document`, `fetch`, `eval` ni APIs externas.
- Se conservan límites de recursión, instrucciones, variables y tamaño del programa.
- No se habilitan punteros, memoria dinámica ni includes externos.

## Validación realizada
- `tsc --noEmit` sobre parser, AST, validación e intérprete: OK.
- Harness del runtime: declaraciones múltiples, funciones propias, `continue` y `const char` múltiples: OK.
- El ZIP no incluye `node_modules`, por lo que no se ejecutó el build/Vitest completo.

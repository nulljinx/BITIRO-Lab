# BITIRO Lab v7.19 — Sensores de línea individuales

## Objetivo
Reforzar pedagógicamente que tres sensores físicos del mismo tipo no entregan necesariamente el mismo ADC y, por lo tanto, cada canal debe calibrarse con su propio umbral.

## Cambios
- Respuesta estable e individual para sensor izquierdo, central y derecho.
- Se conserva la variación espacial de papel, impresión e iluminación de v7.18.
- Los valores no usan ruido aleatorio por cuadro: la misma posición y el mismo sensor mantienen una respuesta reproducible.
- La calibración explica explícitamente que L/C/R pueden necesitar umbrales diferentes.
- El ejemplo final de código utiliza `UMBRAL_I`, `UMBRAL_C` y `UMBRAL_D`.
- Se agregó una prueba de modelo para verificar tres rangos/umbrales diferentes y estables.

## Resultado pedagógico esperado
El estudiante observa que no existe un único “número mágico” para todos los sensores: mide cada canal, compara blanco/negro, calcula una frontera por sensor y utiliza esas tres referencias en el programa.

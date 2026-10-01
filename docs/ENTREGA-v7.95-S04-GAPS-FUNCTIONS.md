# BITIRO Lab v7.95 — S04 Gaps & Functions

Implementación de la Sesión 04 alineada con `ROB-002-S04-Slide-2025` y el plotter oficial 100 × 200 cm.

## Sesión

- Título: **Gaps y funciones**.
- Pista reconstruida desde `Copia de ROB-002-S04-plotter100x200.pdf`.
- Base roja inicial y base verde final.
- Dos gaps y tres intersecciones.
- Telemetría centrada únicamente en los tres sensores de línea.
- Calibración de tres sensores reutilizada desde S02/S03.

## Solución de referencia

La referencia docente usa únicamente contenidos vistos hasta S04:

- tres sensores y tres umbrales;
- cuarto caso del seguidor: blanco-blanco-blanco = gap;
- ciclo `while` para atravesar el segundo gap;
- funciones sin parámetros (`leerSensores`, `seguirLinea`);
- función con parámetros (`avanzarDerecho`);
- `setup()` solo con inicializaciones.

## Evaluación en simulador

Los cuatro objetivos corresponden a la pauta de la sesión:

1. Seguir la línea usando los tres sensores.
2. Cruzar el primer gap.
3. Atravesar el segundo gap usando `while` y alcanzar la segunda intersección.
4. Detenerse en la tercera intersección.

Las zonas de gap no generan falsos eventos de línea perdida.

## Validación

La solución docente fue ejecutada contra el núcleo del simulador y completa los cuatro objetivos sin diagnóstico de runtime.
Las referencias de S01, S02 y S03 continúan completando sus respectivas misiones en la prueba de regresión del núcleo.

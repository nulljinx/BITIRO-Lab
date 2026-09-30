# BITIRO Lab v7.43 — Design audit baseline

## Motivo

`pnpm verify` llegaba correctamente hasta la auditoría visual, pero `audit:design` trataba como regresiones cientos de colores históricos que ya existían antes de introducir la regla de centralización en `tokens.css`.

## Cambio

- Se congeló la deuda visual existente de v7.42 en `tools/design-token-baseline.json`.
- La auditoría sigue prohibiendo nuevos colores raw (`#hex`, `rgb/rgba/...` y colores nominales) fuera de `tokens.css`.
- También falla si aumenta la cantidad de una ocurrencia ya existente.
- Las definiciones de tokens fuera de `tokens.css` continúan prohibidas sin excepción.
- Reducir la deuda existente está permitido y se informa como mejora.

## Estado inicial

La línea base contiene 255 ocurrencias históricas distribuidas en 9 archivos CSS. No se modificó ningún estilo visual para lograr que CI pase.

## Regla

No aumentar `design-token-baseline.json` para hacer pasar un cambio. Los estilos nuevos deben usar variables definidas en `src/styles/tokens.css`.

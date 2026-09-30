# BITIRO Lab v7.44 · E2E baseline stabilization

## Objetivo
Alinear Playwright con el comportamiento real actual de BITIRO sin cambiar la experiencia del alumno para satisfacer pruebas obsoletas.

## Correcciones
- `?debug=1` vuelve a significar solo herramientas de diagnóstico; ya no activa calibración automáticamente.
- El E2E de vistas parte desde la vista 3D real y valida el cambio 3D ↔ 2D.
- El E2E responsive deja de exigir una página sin scroll vertical en escritorio, porque el flujo actual es simulador primero y editor después. Sigue bloqueando overflow horizontal.
- Las comprobaciones de persistencia toleran el instante anterior a la primera escritura en `localStorage`.
- La prueba de calibración verifica explícitamente que debug no active calibración por sí solo.

## Regla
Los tests deben verificar contratos reales del producto. No se debe cambiar runtime, física o UI válida solo para satisfacer una expectativa antigua.

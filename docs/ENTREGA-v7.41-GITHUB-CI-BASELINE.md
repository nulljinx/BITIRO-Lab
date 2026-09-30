# BITIRO Lab v7.41 — GitHub / CI baseline

## Objetivo
Congelar una base estable antes de continuar con S04–S08. Esta versión no cambia la lógica pedagógica del simulador; añade control de calidad y actualiza las pruebas E2E que habían quedado desfasadas respecto de la interfaz actual.

## Cambios
- GitHub Actions en `.github/workflows/ci.yml`.
- Node 24 fijado para desarrollo/CI mediante `.node-version`.
- Instalación reproducible con `pnpm-lock.yaml`.
- Checks separados:
  - `Quality / unit / build`
  - `Browser E2E`
- Nuevos scripts `typecheck`, `test:unit`, `check` y `ci`.
- Plantilla de Pull Request.
- `CONTRIBUTING.md` con flujo de ramas y regla de regresión.
- Documentación para proteger `main`.
- Actualización de Playwright al vocabulario actual: `Probar código`, `Restablecer`, `Detener`.
- Los tests de disponibilidad ahora reconocen S03 como sesión interactiva.
- Tests de calibración actualizados al flujo actual, donde el zoom normal se oculta durante calibración.

## Nota de validación
En este entorno no fue posible instalar `pnpm@11.19.0` desde npm por bloqueo de red, por lo que no se ejecutó la suite completa aquí. El objetivo de esta entrega es que el primer push a GitHub ejecute automáticamente la suite con GitHub Actions.

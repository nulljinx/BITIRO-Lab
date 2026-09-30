# GitHub + CI — base estable de BITIRO Lab

## Objetivo

Usar Git como historial real del proyecto y GitHub Actions como barrera automática para evitar que una mejora futura rompa S01, S02 o S03.

## Rama estable

`main` siempre debe representar una versión ejecutable y probada.

Ramas sugeridas:

- `feature/s04`
- `feature/teacher-resources`
- `fix/s03-sonar`
- `fix/calibration-layout`

## Checks obligatorios

El workflow `.github/workflows/ci.yml` ejecuta dos checks:

1. `Quality / unit / build`
   - TypeScript
   - Vitest
   - pruebas SQL/RLS locales con PGlite
   - auditoría de diseño
   - build de producción

2. `Browser E2E`
   - Chromium/Playwright
   - flujo real de navegador sobre un release estático

## Qué protege la suite actual

- parser e intérprete C++ educativo
- presupuesto de ejecución / loops infinitos
- física diferencial
- sensores de línea, IR y sonar
- calibración y viewport
- repetición/restablecimiento de pruebas
- S01 de extremo a extremo en runtime
- decisiones de S02
- escenario, obstáculos, conteo e intersecciones de S03
- soluciones privadas de mentor
- navegación, persistencia y responsive
- fallos de Worker/editor
- accesibilidad básica

## Política para bugs

Ejemplo: si vuelve a aparecer un zoom gigante en calibración, el arreglo no se considera terminado hasta que exista una prueba que falle con el bug y pase con la corrección.

## Protección recomendada para `main`

En GitHub, crea una Ruleset para `main` con:

- Require a pull request before merging
- Require status checks to pass
  - `Quality / unit / build`
  - `Browser E2E`
- Block force pushes
- Block branch deletion

Para un proyecto de una sola persona puedes permitir que el autor apruebe/integre su propio PR; lo importante inicialmente es que los checks sean obligatorios.

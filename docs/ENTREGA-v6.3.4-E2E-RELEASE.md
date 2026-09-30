# BITIRO Lab v6.3.4 — E2E Release Fix

## Problema reproducido

Después de corregir el navegador de Playwright, `pnpm test:e2e` podía lanzar Chromium pero las 16 pruebas recibían páginas vacías/500 cuando el ZIP recién extraído no tenía `dist/`.

El servidor E2E (`tools/serve.mjs`) sirve exclusivamente `dist/`. La entrega fuente deliberadamente no incluye un `dist` precompilado, por lo que ejecutar E2E directamente sin `pnpm build` hacía que el servidor respondiera 500. Eso producía falsos fallos en cascada: no había `h1`, Monaco, canvas, botones ni redirects porque la aplicación nunca había cargado.

## Corrección

- `pnpm test:e2e` ahora genera siempre el release estático antes de levantar el servidor.
- El build se centralizó en `tools/build-release.mjs`.
- `pnpm build` usa el mismo pipeline que E2E.
- `pnpm verify` ya no ejecuta un build duplicado antes de E2E; E2E se encarga del release que valida.
- La prueba de `/version.json` obtiene la versión esperada desde `package.json`, evitando que falle por una versión hardcodeada antigua.
- Se mantiene Chromium de Playwright como navegador por defecto; Edge queda opcional mediante `BITIRO_BROWSER_CHANNEL=msedge`.

## Flujo esperado

```bash
pnpm install --frozen-lockfile
pnpm browser:install
pnpm test:e2e
```

Ya no es necesario ejecutar `pnpm build` manualmente antes de `pnpm test:e2e`.

Para toda la verificación:

```bash
pnpm verify
```

## Alcance

Esta versión no cambia lógica de simulación, autorización institucional, UI ni Supabase. Corrige el harness de release/E2E para que los fallos reportados correspondan a la aplicación real y no a la ausencia de `dist/`.

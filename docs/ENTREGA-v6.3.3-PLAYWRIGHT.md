# BITIRO Lab v6.3.3 — Playwright browser fix

## Problema corregido

La suite E2E estaba acoplada a Microsoft Edge mediante `channel: 'msedge'`. En WSL/Linux eso exige que exista `/opt/microsoft/msedge/msedge`, por lo que 15 pruebas fallaban antes de ejecutar la aplicación aunque BITIRO no tuviera un fallo funcional.

## Solución

- Playwright usa ahora su Chromium administrado por defecto.
- `pnpm test:e2e` instala Chromium automáticamente la primera vez si falta.
- Se añadió `pnpm browser:install` como comando explícito.
- `tools/visual-qa.mjs` usa la misma política.
- Si alguien quiere probar deliberadamente Edge/Chrome, puede definir `BITIRO_BROWSER_CHANNEL`, por ejemplo `BITIRO_BROWSER_CHANNEL=msedge` en un sistema que tenga Edge instalado.

## Validación esperada en WSL

```bash
pnpm install --frozen-lockfile
pnpm browser:install   # opcional; test:e2e lo hace si falta
pnpm test:e2e
pnpm verify
```

La ausencia de Edge ya no debe provocar fallos de lanzamiento.

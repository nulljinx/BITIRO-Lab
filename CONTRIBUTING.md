# Contribuir a BITIRO Lab

BITIRO usa `main` como rama estable. No desarrolles cambios grandes directamente sobre `main`.

## Flujo recomendado

```bash
git switch main
git pull
git switch -c feature/s04
```

Para correcciones:

```bash
git switch -c fix/calibration-zoom
```

Antes de subir cambios:

```bash
pnpm typecheck
pnpm test
pnpm audit:design
pnpm build
```

Para una verificación completa con navegador:

```bash
pnpm verify
```

## Regla de regresión

Cuando un bug llegue a una versión probada, primero se agrega o actualiza una prueba que reproduzca el problema y luego se corrige el código. Así el mismo fallo no debería reaparecer en S04–S08.

## Sesiones

Los cambios de una sesión no deben romper las anteriores. Actualmente S01, S02 y S03 forman parte de la línea base de regresión.

## Pull requests

Los cambios se integran a `main` solo cuando GitHub Actions marca en verde:

- `Quality / unit / build`
- `Browser E2E`

No mezcles una mejora grande de interfaz con cambios de física o runtime salvo que sea estrictamente necesario; PR pequeños son más fáciles de revisar y revertir.

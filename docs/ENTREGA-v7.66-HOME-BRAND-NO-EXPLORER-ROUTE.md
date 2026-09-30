# BITIRO Lab 7.66 — Brand al inicio y retiro de /intermedio

## Cambios
- El logo/brand de BITIRO ahora navega siempre a `/`.
- Se elimina la ruta índice heredada `/intermedio`.
- Se conserva `/intermedio/:sessionId` para el laboratorio directo en entornos locales sin Supabase.
- Se conservan las rutas institucionales `/espacios/:orgId/grupos/:cohortId/intermedio/:sessionId`.
- Los enlaces de recuperación y retorno ya no apuntan al índice eliminado.
- E2E actualizados para comprobar que `/intermedio` redirige al inicio.

## Versión
`7.66.0`

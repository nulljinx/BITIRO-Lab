# BITIRO Lab v7.5 — Simulator Controls Fix

## Correcciones

### Pantalla completa
- Se mantiene el Fullscreen API nativo cuando el navegador lo permite.
- Si el navegador, un iframe o el contexto de ejecución rechaza `requestFullscreen()`, BITIRO activa automáticamente un **modo de pantalla completa CSS de respaldo**.
- `Esc` sale también del modo de respaldo.
- Mientras el modo de respaldo está activo se bloquea el scroll de la página de fondo.

### Zoom 3D
- El zoom de la barra del simulador ahora controla también la cámara de la vista 3D.
- Los botones `-`, `+` y `Ajustar pista` afectan tanto la vista 2D como la 3D.
- La rueda del mouse sobre la vista 3D actualiza el mismo valor de zoom, por lo que el porcentaje de la barra queda sincronizado.
- `+`, `=` y `-` funcionan también cuando el canvas 3D tiene foco.

## No cambia
- Física del IROH.
- Sensores.
- Motor de simulación.
- Supabase, autenticación, roles o progreso.

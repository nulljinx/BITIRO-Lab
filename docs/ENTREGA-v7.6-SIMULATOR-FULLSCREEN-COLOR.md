# BITIRO Lab v7.6 — Simulator Fullscreen + Color Fix

## Correcciones

### Pantalla completa del simulador
- El icono de expansión ubicado junto al zoom ahora abre **el simulador** en pantalla completa.
- Se intenta primero la Fullscreen API nativa.
- Si el navegador la rechaza, se activa un modo de pantalla completa CSS funcional.
- El mismo botón cambia a icono de contraer cuando está activo.
- `Esc` cierra el modo de respaldo.

### Colores del simulador 3D
- La pasada visual v7.3 había dejado el fondo oscuro propagándose a telemetría, barra de ejecución y feedback.
- Ahora el fondo oscuro queda restringido al viewport 3D.
- Telemetría, sensores, sonar, runtime y mensajes recuperan superficies claras y contraste correcto.
- El porcentaje de zoom y sus iconos vuelven a ser legibles en el espacio Mustakis.

## No cambia
- Física del IROH.
- Sensores y motor de simulación.
- Supabase, autenticación, roles o progreso.

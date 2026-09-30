# BITIRO Lab v7.14 — Telemetry + Route Stability

## Panel del simulador
- El panel derecho se reorganiza como un tablero compacto de telemetría.
- Sonar y Pulsador/Golpe quedan juntos en tarjetas compactas.
- El Pulsador queda visible mucho antes, sin depender de bajar casi todo el panel.
- IR y LCD conservan su espacio propio, pero con jerarquía y dimensiones más equilibradas.
- El viewport 3D mantiene prioridad y gana altura útil.

## F5 / recarga directa
- Se corrigió una condición de carrera al recuperar los workspaces después de restaurar la sesión de Supabase.
- En una recarga directa de una URL institucional, BITIRO espera a que el workspace del usuario termine de cargarse antes de decidir si debe redirigir.
- Esto evita que F5 en `/espacios/.../intermedio/S01` envíe prematuramente a `/espacios`.

## Sin cambios
- Física del simulador.
- Motor de ejecución.
- Progreso y permisos.
- Editor Monaco y guardado local/cloud.

# BITIRO Lab v7.36 — Solución del mentor

## Objetivo
Permitir que el mentor tenga una solución de referencia lista dentro del laboratorio y pueda mostrarla al cierre del desafío sin escribirla durante la clase.

## S03
- Se añadió `Solución del mentor`, cerrada por defecto.
- Solo se renderiza cuando el espacio indica `can_manage`.
- Incluye una solución de referencia completa para S03.
- El mentor puede copiarla o cargarla directamente en Monaco.
- Los participantes no ven el panel en la interfaz.

## Nota de seguridad
La restricción actual es de interfaz/rol en el cliente. Si en producción se requiere que el código de solución no forme parte del bundle descargable por participantes, debe almacenarse y servirse desde backend mediante una operación protegida para mentores.

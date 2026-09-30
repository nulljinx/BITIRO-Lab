# BITIRO Lab v6.4.1 — Spaces Hub & Onboarding Polish

## Objetivo

Hacer que **Mis espacios** funcione como un verdadero hub de programas y que el código institucional deje de ocupar permanentemente la pantalla después de vincular el primer espacio.

## Cambios

- Si la cuenta no tiene espacios, el código institucional continúa siendo la acción principal de onboarding.
- Si la cuenta ya tiene uno o más espacios, el formulario de código desaparece de la vista principal.
- Se incorpora el botón secundario **Añadir espacio**.
- El botón abre un diálogo accesible para ingresar un nuevo código institucional.
- Las tarjetas muestran de forma explícita el rol **dentro de ese espacio**, evitando confundirlo con un rol global de BITIRO.
- Las acciones cambian según el rol:
  - Participante → `Entrar al programa`
  - Mentor → `Gestionar grupo`
  - Administración → `Administrar espacio`
- Después de canjear un código se muestra una confirmación explícita con institución, programa, grupo y rol antes de entrar.
- El nuevo espacio queda asociado a la cuenta como antes; no cambia el modelo de seguridad ni RLS.

## Base de datos

Esta versión **no agrega migraciones**. Usa las mismas funciones/RLS de v6.4.

## Flujo esperado

```text
Cuenta sin espacios
→ Código institucional visible
→ Canjear
→ Confirmación de rol y grupo
→ Ir al espacio

Cuenta con espacios
→ Lista de espacios
→ Añadir espacio (botón secundario)
→ Diálogo de código
→ Confirmación
```

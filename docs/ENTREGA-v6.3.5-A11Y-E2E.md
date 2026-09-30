# BITIRO Lab v6.3.5 — A11y + E2E Fix

## Motivo

Después de corregir el pipeline E2E, 14/16 escenarios pasaron. Los dos fallos restantes eran independientes del motor y de Supabase.

## Correcciones

1. **Nombre accesible del CTA móvil**
   - En móvil, `.header-register span` se oculta visualmente.
   - El enlace ahora declara `aria-label="Crear cuenta"`, por lo que conserva nombre accesible para lectores de pantalla y axe.

2. **Guía en el contexto correcto**
   - Desde v6.3 la guía/conceptos se expone en el laboratorio de una sesión, no en el explorador.
   - El E2E antiguo seguía intentando abrirla en `/intermedio`.
   - La prueba ahora valida que no esté en el explorador y luego comprueba apertura/cierre accesible dentro de `/intermedio/s01`.

## Alcance

No se modificaron:
- autorización/RLS;
- códigos institucionales;
- motor de simulación;
- pistas;
- Supabase;
- diseño general.

## Validación esperada

```bash
pnpm test:e2e
pnpm verify
```

Objetivo: **16/16 E2E** y suite completa verde antes de conectar el proyecto Supabase.

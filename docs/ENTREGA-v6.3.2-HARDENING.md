# BITIRO Lab 6.3.2 — Institutional Hardening

Esta entrega corrige los hallazgos institucionales prioritarios de la auditoría 360 de la rama 6.3.x sin añadir nuevas funciones visuales ni modificar el motor del simulador.

## Corregido

- rate limit de códigos institucionales persistente: los intentos inválidos ya no desaparecen por rollback;
- revocación efectiva por organización/cohorte y por estado de organización, programa, sede y cohorte;
- un código compartido no reactiva una membresía suspendida;
- rol de mentor estrictamente por cohorte; no se propaga a otros grupos de la misma organización;
- `list_my_workspaces()` entrega `role` y `can_manage` efectivos para cada cohorte;
- seed de producción sin códigos demo conocidos;
- seed demo separado y explícitamente no apto para producción;
- rutas institucionales con `organizationId + cohortId`;
- código y progreso local separados por usuario + cohorte + versión de actividad;
- estados `loading / error / data` explícitos en workspace y panel mentor;
- S03–S08 dejan de pedir imágenes de pista inexistentes;
- refuerzo responsive del header a 320 px;
- auditoría institucional append-only para redención de códigos y liberación de sesiones.

## Rutas canónicas

```text
/espacios/:organizationId/grupos/:cohortId
/espacios/:organizationId/grupos/:cohortId/mentor
/espacios/:organizationId/grupos/:cohortId/intermedio/:sessionId
```

Las rutas antiguas se mantienen únicamente como redirecciones de compatibilidad. Si una organización tiene más de una cohorte, una ruta antigua ambigua redirige a `Mis espacios`.

## Base de datos

Aplicar en este orden:

1. `202609170001_accounts_and_learning.sql`
2. `202609180001_institution_workspaces.sql`
3. `202609180002_institution_hardening.sql`
4. `seed.sql`

Solo para desarrollo/pruebas controladas puede aplicarse después `seed.demo.sql`.

## Verificación recomendada

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm test:db
pnpm audit:design
pnpm build
pnpm test:e2e
```

O bien:

```sh
pnpm verify
```

## Alcance que no cambia

- S01 y S02 siguen siendo los laboratorios interactivos disponibles;
- S03–S08 aún no son simulaciones completas;
- el runtime, parser, física y API IROH no fueron rediseñados;
- Modo Foco y renderer 3D quedan para una versión posterior, después de validar este hardening en staging/piloto.

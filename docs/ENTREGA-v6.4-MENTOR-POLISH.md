# BITIRO Lab v6.4 — Mentor & Institutional Polish

## Objetivo

Consolidar la experiencia institucional real después de conectar Supabase: la vista de mentor ya no se comporta como una vista de participante y el estado del contenido distingue claramente entre **publicado**, **no publicado** y **en preparación**.

## Cambios principales

- Vista del workspace adaptada al rol efectivo de la cohorte.
- El mentor ya no ve el texto "Tu mentor habilita...".
- S01/S02 muestran el estado real `Publicada` / `No publicada`.
- S03–S08 muestran `En preparación` mientras no exista laboratorio interactivo.
- El mentor puede abrir S01/S02 para revisarlas aunque todavía no estén publicadas para participantes.
- Acciones rápidas `Publicar para alumnos` / `Ocultar a alumnos` desde el workspace.
- Panel de mentor actualizado con acciones explícitas en lugar de un switch ambiguo.
- Resumen de cohorte con participantes, mentores y prácticas publicadas.
- Nueva RPC `mentor_workspace_overview` protegida por autorización de cohorte.
- El participante conserva una experiencia separada: solo ve detalles de sesiones publicadas.

## Migración nueva

```text
supabase/migrations/202609180003_mentor_workspace_polish.sql
```

Después de vincular el proyecto Supabase:

```bash
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

La migración es aditiva: no modifica códigos institucionales ni membresías existentes.

## Validación mentor ↔ participante recomendada

1. Entrar con una cuenta mentor del grupo.
2. Confirmar que S01 esté `No publicada`.
3. Publicar S01.
4. Entrar con una cuenta participante del mismo grupo.
5. Confirmar que S01 aparece y se puede abrir.
6. Ocultar S01 desde mentor.
7. Confirmar que el participante ya no puede acceder a ella ni por URL directa.

## Alcance

Esta versión no modifica el motor de simulación ni agrega 3D. El siguiente incremento puede retomar Modo Foco una vez validado el flujo real mentor ↔ participante.

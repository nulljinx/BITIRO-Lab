# BITIRO Lab v6.4.2 — Participant Pilot Flow

## Objetivo

Cerrar el flujo institucional mínimo necesario para probar BITIRO con un mentor y un participante reales sin depender del SQL Editor para cada incorporación.

## Flujo

```text
Mentor
  ↓
Panel del grupo
  ↓
Crear código de participantes
  ↓
Alumno crea cuenta BITIRO y confirma correo
  ↓
Alumno canjea código
  ↓
Aparece en el roster del grupo
  ↓
Mentor publica S01
  ↓
Alumno puede abrir S01
  ↓
Mentor oculta S01
  ↓
Alumno queda bloqueado también por URL directa
```

## Funciones nuevas

- `mentor_get_participant_invite(cohort_id)`
- `mentor_create_participant_invite(cohort_id, max_uses, valid_days)`
- `mentor_revoke_participant_invite(cohort_id)`
- `mentor_list_participants(cohort_id)`

Todas requieren permiso efectivo de mentor/administración sobre la cohorte.

## Seguridad

- Los códigos se generan en PostgreSQL, no en el navegador.
- Solo se genera un código de participantes activo por cohorte; rotarlo invalida el anterior.
- La validez se limita a 1–60 días y 1–200 usos.
- El roster no expone correo ni datos de autenticación, solo nombre visible y fecha de incorporación.
- Las acciones generan eventos de auditoría institucional.
- Las políticas de publicación de sesiones siguen siendo independientes del código de incorporación.

## Migración

Aplicar únicamente:

```sh
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

El dry-run debe mostrar:

```text
202609180004_participant_pilot.sql
```

No es necesario volver a ejecutar `seed.sql`.

## Prueba manual recomendada

1. Entrar como mentor y crear un código de participantes (por ejemplo 5 usos / 7 días).
2. Abrir una ventana privada del navegador.
3. Crear una cuenta BITIRO distinta y confirmar el correo.
4. Canjear el código desde `Mis espacios`.
5. Confirmar que el alumno aparece en el roster del mentor.
6. Mantener S01 no publicada y comprobar que el alumno no puede abrirla.
7. Publicar S01 desde el mentor y refrescar al alumno: debe aparecer.
8. Ocultarla otra vez y comprobar bloqueo por enlace directo.

## Fuera de alcance

- progreso cloud completo;
- métricas pedagógicas por participante;
- S03–S08 interactivas;
- modo foco;
- renderer 3D;
- pulido visual final.

# BITIRO Lab 6.4.3 — Cloud Learning

BITIRO Lab es una plataforma de práctica de robótica educativa. Esta entrega conserva S01–S02 interactivas y consolida la arquitectura institucional: **primero existe la cuenta BITIRO; después se añade un programa con un código entregado por la institución o mentor**.

## Regla de producto

```text
Landing BITIRO
    ↓
Crear cuenta / Iniciar sesión
    ↓
Cuenta BITIRO autenticada
    ↓
Mis espacios
    ↓
Código institucional
    ↓
Organización + sede + programa + cohorte
    ↓
Sesiones liberadas por el mentor
```

El código **no crea una cuenta** y no sustituye el inicio de sesión. Solo añade un programa institucional a una cuenta BITIRO ya autenticada.



## Qué cambia en 6.4.3

- código Arduino/C++ guardado en Supabase por usuario + cohorte + sesión + versión, con copia local;
- restauración desde nube cuando no hay trabajo local y resolución **explícita** si existen versiones diferentes;
- guardado por revisión optimista (CAS), sin sobrescribir en silencio ediciones concurrentes;
- avance formativo `visitada` / `intentada`, que se muestra en el editor y en el resumen por alumno para el mentor;
- RLS + RPC protegidas: no hay acceso directo del navegador a tablas de código/progreso institucional;
- nueva migración `202609190001_cohort_learning.sql`; no reejecutar semillas tras aplicarla;
- **`completada` sigue pendiente de evaluación real por misión**; no se atribuye por abrir la página ni por pulsar Ejecutar.

Detalles, limitaciones, actualización de Supabase y prueba manual en `docs/ENTREGA-v6.4.3-CLOUD-LEARNING.md`.

## Qué cambia en 6.4.2

- el mentor puede crear desde BITIRO un código reutilizable para participantes de su cohorte;
- generar un código nuevo revoca automáticamente el anterior de participantes para ese grupo;
- el código define cupos (1–200) y vigencia (1–60 días);
- el mentor puede copiar o revocar el código sin entrar al SQL Editor;
- el panel muestra la lista de participantes activos del grupo;
- un participante no puede generar códigos ni leer el roster;
- se agregan auditorías para creación y revocación de invitaciones;
- nueva migración `202609180004_participant_pilot.sql`;
- este hito deja listo el ensayo real mentor → alumno → publicación/ocultamiento.

## Qué cambia en 6.4.1

- `Mis espacios` ahora es un hub de programas cuando la cuenta ya tiene accesos.
- El formulario de código deja de ocupar permanentemente la pantalla después del primer vínculo.
- `Añadir espacio` abre un diálogo secundario.
- Cada tarjeta muestra claramente el rol dentro de ese grupo y una acción contextual.
- Tras canjear un código se confirma explícitamente el rol, programa y grupo antes de entrar.
- No hay nuevas migraciones de base de datos en esta versión.

## Qué cambia en 6.4

- experiencia diferenciada para participante y mentor;
- el mentor ve métricas básicas del grupo y redacción específica para su rol;
- S01–S02 muestran el estado real `Publicada` / `No publicada`;
- S03–S08 muestran `En preparación` mientras su laboratorio no esté implementado;
- el mentor puede revisar un laboratorio antes de publicarlo para los alumnos;
- acciones rápidas para publicar/ocultar contenido desde el workspace y desde el panel de mentor;
- participantes siguen viendo únicamente las sesiones que el backend confirma como publicadas;
- nueva RPC `mentor_workspace_overview` protegida por autorización de cohorte;
- se conserva todo el hardening de códigos, roles por cohorte, suspensión y rutas canónicas de 6.3.x.

## Abrir localmente

```sh
pnpm install --frozen-lockfile
pnpm dev --host 0.0.0.0
```

### Importante

Para probar registro, códigos y espacios institucionales debes configurar Supabase. Una instalación sin Supabase ya **no simula una membresía institucional**, porque eso contradecía el modelo account-first.

Copia `.env.example` a `.env.local` y configura únicamente las credenciales públicas del proyecto. Nunca uses `service_role` en el navegador.

## Configurar Supabase

Aplica en orden:

1. `supabase/migrations/202609170001_accounts_and_learning.sql`
2. `supabase/migrations/202609180001_institution_workspaces.sql`
3. `supabase/migrations/202609180002_institution_hardening.sql`
4. `supabase/migrations/202609180003_mentor_workspace_polish.sql`
5. `supabase/migrations/202609180004_participant_pilot.sql`
6. `supabase/migrations/202609190001_cohort_learning.sql`
7. `supabase/migrations/202609190002_formative_missions.sql`
8. `supabase/seed.sql` (catálogo seguro; sin códigos de acceso demo)

Después configura las variables públicas descritas en `docs/SEGURIDAD-Y-DESPLIEGUE.md`. Para una guía directa de conexión usa `docs/SUPABASE-CONEXION.md`.

## Verificación

```sh
pnpm test
pnpm test:db
pnpm audit:design
pnpm build
pnpm test:e2e
```

`pnpm verify` ejecuta la secuencia completa.

## Rutas principales

| Ruta | Función |
| --- | --- |
| `/` | Entrada general BITIRO |
| `/registro` / `/login` | Cuenta BITIRO |
| `/espacios` | Programas asociados a la cuenta; requiere autenticación |
| `/espacios/mustakis/grupos/mustakis-demo-talca` | Workspace institucional Mustakis |
| `/espacios/mustakis/grupos/mustakis-demo-talca/intermedio/s01` | Laboratorio institucional con control de liberación |
| `/espacios/mustakis/grupos/mustakis-demo-talca/mentor` | Gestión de sesiones para mentores |

## Estado funcional

- S01: simulación interactiva.
- S02: simulación interactiva.
- S03–S08: todavía no implementadas como simulación institucional.
- Códigos: redención y rate limit en PostgreSQL.
- Workspace Mustakis: vista específica para participante/mentor, enlaces institucionales y contenido por cohorte.
- Panel mentor: métricas, invitación de participantes, roster básico, publicación/ocultamiento explícito y estado honesto de sesiones en preparación.
- Generación/revocación de códigos de participantes desde UI: implementada para mentores.
- Progreso pedagógico cloud: visitas e intentos registrados por cohorte; finalización verificada aún pendiente.
- Modo foco y simulador 3D: siguientes etapas.

## Documentación

- `docs/INSTITUTION-WORKSPACES.md`
- `docs/SEGURIDAD-Y-DESPLIEGUE.md`
- `docs/ARQUITECTURA-PRODUCTO.md`
- `docs/FUENTES-INSTITUCIONALES.md`
- `docs/ENTREGA-v6.4-MENTOR-POLISH.md`

> La personalización Mustakis incluida aquí es un prototipo de integración para evaluación. El uso de logotipos oficiales, material curricular protegido o la presentación como servicio oficial requiere autorización de la institución.

## Corrección geométrica heredada de 6.2.1

`isInsideFinishZone` conserva una tolerancia de `1e-9 cm` para evitar falsos negativos en límites por redondeo IEEE-754. No modifica la geometría de las pistas.

## 6.3.2 — Institutional Hardening

Esta versión prioriza la separación y seguridad de grupos antes de continuar con 3D:

- las rutas institucionales incluyen `organization_id + cohort_id`;
- código y progreso local se separan por cuenta + cohorte + versión de actividad;
- `list_my_workspaces()` devuelve rol y capacidad efectiva por cohorte;
- una suspensión institucional/cohorte revoca las RPC y no puede levantarse reutilizando un código compartido;
- los intentos fallidos de códigos quedan persistidos y consumen un presupuesto de 10 intentos / 15 minutos;
- `supabase/seed.sql` ya no instala códigos conocidos; `supabase/seed.demo.sql` es solo para desarrollo/pruebas;
- los estados de carga/error/vacío no se confunden con sesiones bloqueadas;
- S03–S08 no solicitan plotters inexistentes.

Para un entorno local de demostración, después de aplicar las migraciones y `seed.sql`, ejecuta manualmente `supabase/seed.demo.sql`. En producción no ejecutes ese archivo.


## Playwright en WSL/Linux

Los E2E usan Chromium administrado por Playwright, no Microsoft Edge del sistema. `pnpm test:e2e` instala Chromium automáticamente si falta. También puedes hacerlo explícitamente con `pnpm browser:install`.

### v6.3.4 — E2E autocontenido

`pnpm test:e2e` construye automáticamente el release estático antes de levantar Playwright. Un ZIP fuente limpio ya no produce falsos 500 por ausencia de `dist/`. La versión esperada por E2E se lee desde `package.json`.


### v6.3.5 — Accesibilidad móvil + E2E de guía

- El CTA móvil **Crear cuenta** conserva nombre accesible aunque su texto visual se oculte a menos de 768 px.
- La prueba de accesibilidad con axe vuelve a validar 1440 / 390 / 320 px.
- El E2E de guía respeta la arquitectura actual: la guía se abre dentro de una sesión, no desde el explorador.
- No cambia permisos institucionales, simulación ni Supabase.

## v6.4 — Mentor & Institutional Polish

Esta entrega está pensada para el piloto real en Talca. Después de actualizar el código, aplica la migración nueva con:

```sh
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

La migración solo agrega una RPC de resumen para mentores. No elimina ni reescribe cohortes, códigos o membresías existentes.


## Licencia y propiedad intelectual

Este repositorio se encuentra actualmente bajo **derechos reservados** mientras se clarifican
la titularidad y los permisos necesarios para una eventual publicación o licencia open source.
Los nombres, logotipos, fotografías, contenidos educativos y demás recursos institucionales de
Fundación Gabriel & Mary Mustakis y de terceros **no** quedan licenciados por el código del proyecto.

Revisa `LICENSE`, `NOTICE` y `BRAND_AND_CONTENT_LICENSE.md` antes de reutilizar o redistribuir
material del repositorio.

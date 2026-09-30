# Conexión de Supabase para BITIRO Lab

BITIRO ya incluye el cliente de Supabase, autenticación PKCE, registro, recuperación de contraseña y acceso a datos institucionales. Para activar estas funciones en un proyecto real solo deben configurarse las credenciales públicas y aplicar el esquema incluido en el repositorio.

## 1. Variables públicas

En Supabase abre **Project Settings → API** y copia únicamente:

- Project URL
- Publishable key (`sb_publishable_...`) o, en proyectos antiguos, la clave `anon`

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`.env.local` está ignorado por Git. **No uses** `service_role`, claves `sb_secret_...`, contraseña de la base de datos ni secretos SMTP en Vite.

Reinicia Vite después de cambiar estas variables.

## 2. Aplicar la base de datos

Con Supabase CLI vinculado al proyecto:

```sh
pnpm exec supabase login
pnpm exec supabase link --project-ref TU_PROJECT_REF
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

Las migraciones versionadas se aplican en orden automáticamente. El repositorio contiene actualmente:

1. `202609170001_accounts_and_learning.sql`
2. `202609180001_institution_workspaces.sql`
3. `202609180002_institution_hardening.sql`
4. `202609180003_mentor_workspace_polish.sql`
5. `202609180004_participant_pilot.sql`
6. `202609190001_cohort_learning.sql`
7. `202609190002_formative_missions.sql`

Después puedes cargar el catálogo seguro:

```sh
pnpm exec supabase db reset   # solo en entorno local/desarrollo si corresponde
```

Para producción no ejecutes `supabase/seed.demo.sql`.

## 3. URLs de autenticación

En **Authentication → URL Configuration** configura el origen de producción como Site URL y conserva como Redirect URLs, al menos:

- `http://localhost:5173/auth/callback`
- `http://localhost:5173/auth/callback?recovery=1`
- `http://127.0.0.1:5173/auth/callback`
- `http://127.0.0.1:5173/auth/callback?recovery=1`
- la URL HTTPS real de BITIRO con `/auth/callback` y `/auth/callback?recovery=1`

## 4. Prueba mínima

1. Reinicia `pnpm dev`.
2. Abre `/registro` y crea una cuenta de prueba.
3. Confirma el correo si las confirmaciones están habilitadas.
4. Ingresa en `/login`.
5. Verifica que `/espacios` cargue sin el estado `unconfigured`.

Si el login responde con error de credenciales, BITIRO muestra un mensaje genérico para no revelar si una cuenta existe.

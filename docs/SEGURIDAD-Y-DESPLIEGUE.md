# Cuentas y despliegue de BITIRO Lab 6.2

Estado: implementación local lista para configurar. No hay proyecto Supabase, proveedor SMTP ni hosting de producción conectado en esta entrega. El dominio previsto es `nulljinx.com`.

## 1. Crear el servicio de datos

Crea un proyecto Supabase de desarrollo y uno de producción cuando corresponda. Usa el SQL Editor del proyecto nuevo para ejecutar, en este orden:

1. `supabase/migrations/202609170001_accounts_and_learning.sql`.
2. `supabase/migrations/202609180001_institution_workspaces.sql`.
3. `supabase/migrations/202609180002_institution_hardening.sql`.
4. `supabase/migrations/202609180003_mentor_workspace_polish.sql`.
4. `supabase/seed.sql` (catálogo seguro; sin códigos de acceso demo).

La migración crea tablas y no es idempotente: aplícala una sola vez a una base nueva. En una base existente revisa los nombres antes de migrar. No desactives RLS para solucionar errores de permisos. El archivo `supabase/config.toml` configura desarrollo con CLI; no cambia automáticamente los ajustes de un proyecto alojado.

En Authentication habilita email/password, registro y confirmación de correo. Fija el mínimo de contraseña en 12 caracteres también en el servidor. Configura SMTP transaccional y verifica el remitente/dominio en tu proveedor, con sus registros DNS de autenticación. Ajusta límites de registro y recuperación al volumen del programa. No publiques depender únicamente del correo de prueba del proveedor. Fuente: [contraseñas y correo en Supabase](https://supabase.com/docs/guides/auth/passwords).

Configura Site URL: `https://nulljinx.com`. Permite exactamente:

- `https://nulljinx.com/auth/callback`
- `https://nulljinx.com/auth/callback?recovery=1`

Para probar localmente permite las mismas rutas en `http://127.0.0.1:5198` o en el origen de Vite que estés usando. No uses comodines amplios en producción. Los enlaces PKCE deben abrirse en el mismo navegador que inició la solicitud. Un enlace expirado o abierto en otro navegador puede requerir solicitar uno nuevo. Si el cambio seguro de contraseña exige una sesión reciente, vuelve a ingresar o usa recuperación antes de cambiarla.

## 2. Conectar el frontend

Copia `.env.example` a `.env.local` y completa:

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
```

La clave publishable es pública por diseño. También se acepta la clave heredada `anon` mediante `VITE_SUPABASE_ANON_KEY`. **No uses `service_role`, `sb_secret_`, contraseña PostgreSQL ni credenciales SMTP en variables VITE.** Las variables VITE entran en el bundle del navegador; rechazarlas en ejecución no impediría su exposición en el archivo compilado. RLS es la barrera de autorización. Consulta [políticas RLS oficiales](https://supabase.com/docs/guides/database/postgres/row-level-security).

Ejecuta `pnpm build`. Las variables se leen al compilar, no al iniciar `tools/serve.mjs`. El build suministrado sin configuración mantiene el laboratorio disponible y explica que las cuentas no están habilitadas.

## 3. Crear el primer administrador

Registra tu cuenta desde BITIRO y confirma el correo. Comprueba su UUID en Authentication → Users. Desde el SQL Editor, con el rol propietario, ejecuta la siguiente transacción sustituyendo el UUID por el de TU cuenta confirmada:

```sql
begin;
do $$
declare account_id uuid := 'REEMPLAZAR-POR-TU-UUID';
begin
  if not exists (select 1 from auth.users where id=account_id and email_confirmed_at is not null)
    then raise exception 'La cuenta debe existir y tener correo confirmado'; end if;
  update public.memberships set role='admin',updated_at=now() where user_id=account_id;
  if not found then raise exception 'La cuenta no tiene membresía BITIRO'; end if;
end $$;
commit;
```

Este paso es de bootstrap administrativo y queda registrado por el trigger de auditoría. Nunca se ejecuta desde el navegador. Después cierra e inicia sesión y entra en `/equipo`; asigna facilitadores y sedes desde esa interfaz. Las cuentas nuevas siempre son participantes, aunque alguien altere el formulario o sus metadatos. El administrador tiene alcance global; el facilitador solo consulta personas de su sede. La RPC impide degradar al último administrador, incluso con cambios concurrentes. La eliminación administrativa directa desde Supabase requiere controlar por separado que quede un administrador disponible.

## 4. Publicar frontend estático

Se incluye `netlify.toml` como configuración de referencia ejecutable para hosting estático: build, carpeta `dist`, rutas de aplicación y encabezados. No se ha creado ni contratado un servicio. Puedes conectar este repositorio a Netlify y configurar las dos variables públicas de compilación en su panel. El proveedor instala las dependencias desde el lockfile; usa Node 22.12 o superior.

Añade `nulljinx.com` como dominio del sitio y usa **los registros DNS que indique el proveedor para ese proyecto**. No se incluyen IP inventadas ni se cambia el DNS existente. Activa HTTPS y el redireccionamiento a un origen canónico; si usas `www` o un subdominio cambia también Site URL y allowlist de Supabase. Verifica `/intermedio/s01` al recargar directamente. Referencia: [reescrituras para SPA](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).

La CSP permite scripts y Workers propios y conexiones al dominio estándar de Supabase; no permite `unsafe-eval`. Los estilos inline son necesarios para Monaco. Para un dominio personalizado de API adapta `connect-src` en el hosting y en el servidor de prueba. HSTS se aplica en hosting HTTPS, no en HTTP local. Comprime archivos, conserva caché larga solo para assets con hash y usa revalidación para HTML. Guarda releases anteriores para rollback.

## 5. Validación de producción antes de abrir el registro

Con cuentas de prueba controladas por el operador, valida registro, confirmación, ingreso, recuperación, cambio de contraseña, cierre de sesión y sesión expirada. No uses correos de estudiantes para ensayar. Comprueba participante A, facilitador de su sede, facilitador de otra sede y administrador, intentando leer y modificar registros mediante la API; no basta con observar botones ocultos. Verifica la entrega real del correo y los encabezados HTTPS. Estas comprobaciones remotas siguen pendientes porque no hay servicio conectado.

Completa en el aviso público la identidad y contacto del responsable, finalidades, conservación y procedimiento de acceso/borrado de datos. Si se habilita para menores, define el proceso institucional correspondiente antes de registrar datos reales. No se afirma certificación legal ni de accesibilidad. La pantalla actual es una explicación técnica de datos, no sustituye ese aviso definitivo.

## Controles implementados y límites

- RLS en todas las tablas públicas; lectura de sedes activas y acceso autenticado según propietario, sede y rol.
- Roles en tabla protegida, nunca en localStorage o metadatos editables. Sin SQL construido desde búsquedas; parámetros en RPC y funciones con search_path restringido.
- Contraseñas gestionadas por Supabase, PKCE, respuestas genéricas, tiempos de espera de red y redirecciones locales permitidas.
- Tokens de sesión del SDK persistidos en este navegador: CSP reduce exposición, pero no convierte el navegador en un almacén inviolable. Cierra sesión en equipos compartidos. El código local por usuario separa la experiencia; una persona con control del perfil del navegador puede inspeccionar ese almacenamiento. No usarlo para secretos.
- Sin código C++ evaluado como JavaScript. Parser/intérprete en Worker con presupuesto de ejecución, límite de tamaño y recuperación.
- Sin backend propio de cookies: el API usa token bearer. Si se incorporan cookies o endpoints propios, diseñar también protección CSRF y autorización correspondiente.
- Tablas de código con límite de bytes, revisión y control de propietario; **sin cliente de sincronización cloud todavía**. La política permite lectura pedagógica de trabajos por facilitador de la sede, cuando exista esa función.
- Organización en catálogo como preparación; no existe aún aislamiento entre administradores de varias instituciones. Antes de ofrecer múltiples clientes, introducir tenant y membresías con pruebas entre organizaciones.
- El registro BITIRO ya no solicita sede. La pertenencia a una institución, sede y cohorte se crea al redimir un código institucional válido. Los códigos demo viven únicamente en `supabase/seed.demo.sql`. No ejecutar ese archivo en producción.

## Operación y evolución

El frontend es estático y la física se ejecuta en el navegador, por lo que no requiere un servidor por simulación. Las listas de personas se filtran y paginan en PostgreSQL. Mide consultas y añade índices de búsqueda al crecer; no se ha ejecutado una prueba de carga de miles de cuentas. Documenta backup y restauración de Supabase, retención de auditorías, revocación de accesos y respuesta a incidentes. Los próximos incrementos son generación/revocación segura de códigos, progreso por cohorte, contenidos privados y panel de mentor. Después: modo foco, renderer 3D desacoplado y motores S03–S08 validados.

## 6.3.2 — acceso institucional endurecido

- Los códigos institucionales solo se muestran y redimen después de autenticar una cuenta BITIRO.
- `/espacios` y las rutas institucionales requieren cuenta.
- El modo local sin Supabase no simula membresías institucionales.
- `next` admite únicamente rutas internas autorizadas para evitar open redirects.


### Desarrollo local con datos demo

`supabase/seed.demo.sql` crea únicamente el grupo/códigos de demostración. Ejecútalo manualmente en una base local o de pruebas controlada. **No forma parte del procedimiento de producción.**

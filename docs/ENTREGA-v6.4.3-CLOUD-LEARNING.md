# BITIRO Lab 6.4.3 — Código y actividad por cohorte

## Alcance de esta entrega

**Implementado:**

- Fuente Arduino/C++ almacenada en Supabase por **identidad autenticada + cohorte + sesión + versión de actividad**. Se sigue guardando una copia local de inmediato.
- Lectura del documento cloud al abrir una práctica autorizada. Si existe una copia local diferente, **no se reemplaza ninguna silenciosamente**: el alumno elige entre las dos versiones.
- Guardado remoto con revisión *compare-and-swap* para detectar cambios realizados en otra pestaña o dispositivo. En caso de conflicto, conserva el archivo local y pide elegir.
- Los accesos de alumno se comprueban **en cada operación de base de datos**: cuenta autenticada, membresía activa, grupo activo y sesión publicada; los mentores pueden consultar su propio documento de una sesión aunque no esté publicada para los participantes.
- Registro del estado **Visitada** al abrir el editor de una sesión y **Intentada** al presionar *Ejecutar en simulador*. Los estados son progresivos: una visita posterior no rebaja un intento.
- Panel de mentor: por participante, muestra recuentos de sesiones visitadas e intentadas del grupo; no expone el código del estudiante.
- Aislamiento de código/progreso entre cohortes y versiones. Las tablas nuevas no conceden acceso directo ni siquiera a `authenticated`; solo se utiliza la API/RPC autorizada.
- Tests RLS adicionales: membresía, publicación/ocultamiento, accesos cruzados, revisión CAS, tamaño de fuente, suspensión y prohibición de reclamar finalización.

**Todavía no implementado:**

- `Completada`/`verificada`. No se asigna por abrir una sesión, por ejecutar código, por entrar en una zona ni por marcar un botón del navegador: falta diseñar un evaluador por misión que compruebe la secuencia real de acciones. El mentor ve únicamente datos de visita/intento, **no calificaciones**.
- Sincronización *offline-first* completa: una pestaña cerrada mientras muestra «Sincronizando» puede dejar la última versión únicamente en almacenamiento local. Debe esperarse a «Nube sincronizada» antes de cambiar de dispositivo. Si falla la red, el código local sigue disponible; recargar la página reintenta la consulta.
- Edición colaborativa y resolución automática de conflictos: la resolución es intencionalmente manual para impedir pérdidas de trabajo.
- Restricciones criptográficas sobre un bundle ya descargado: la nueva RPC protege los datos cloud y vuelve a comprobar los permisos en cada solicitud; los recursos que el navegador ya recibió no pueden retirarse de su memoria en tiempo real.

## Instalar sobre el proyecto existente

1. Extrae `BITIRO-Lab-v6.4.3-Cloud-Learning.zip` en una **carpeta nueva**. No mezcles versiones dentro de `Downloads`.
2. Copia `.env.local` de tu carpeta de BITIRO 6.4.2. **No compartas ese archivo.**
3. Instala dependencias con `pnpm install --frozen-lockfile`.
4. Vincula la carpeta al mismo proyecto de Supabase con `pnpm dlx supabase@latest link --project-ref TU_PROJECT_REF` (o utiliza la CLI del proyecto si ya está instalada).
5. Inspecciona `pnpm dlx supabase@latest db push --dry-run`. Si las cinco migraciones previas están aplicadas, **solo** debe anunciar `202609190001_cohort_learning.sql`.
6. Ejecuta `pnpm dlx supabase@latest db push`. **No uses `--include-seed` ni ejecutes `seed.demo.sql`** en tu base con cuentas reales.
7. Ejecuta `pnpm verify` para verificar unitarios, PGlite/RLS, tokens y E2E del simulador público en un `dist-e2e/` aislado (sin conectar al proyecto remoto). Luego ejecuta `pnpm build` para generar `dist/` **con** tu `.env.local` y `pnpm dev` para probar manualmente con tus cuentas de mentor y participante. Los E2E locales no sustituyen una prueba Auth/Storage real en staging.

## Prueba manual con las cuentas piloto

1. Como **sunny**, abre S01 publicada y modifica una línea de código. Espera primero «Guardado local» y después «Nube sincronizada». Ejecuta el programa: la práctica deberá figurar como «Intentada (sin evaluación automática)».
2. Como **Martin**, entra en su grupo y abre el panel de mentor. Pulsa **Actualizar**: sunny debe figurar con un intento en el resumen de sus prácticas. El código de sunny **no** debe aparecer en la vista de mentor.
3. Como sunny, abre S02: no debe compartir el código guardado en S01. Si abres la misma sesión en dos dispositivos y creas ediciones divergentes, no debe sobreescribirse la copia local sin aviso.
4. Como Martin, oculta S01. Tras recargar la página de sunny, la práctica debe quedar bloqueada; tampoco debe ser posible leer, guardar código o marcar actividad de S01 directamente mediante las RPC de un participante.
5. Vuelve a publicar S01 y verifica que el código previamente guardado sigue asociado a sunny y al grupo correcto.

La migración no modifica las tablas anteriores `public.code_documents` y `public.program_progress`: pertenecen a la base histórica, no llevan clave de cohorte y **no se reutilizan para estos documentos institucionales**. El código local anterior sigue separado por usuario y cohorte; cuando existe, el editor lo conserva y ofrece sincronización sin importarlo de otra cuenta o grupo.

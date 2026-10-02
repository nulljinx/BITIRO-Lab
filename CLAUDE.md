# BITIRO Lab — Claude Code

BITIRO Lab es una plataforma educativa de robótica con simulador para estudiantes y espacios institucionales para participantes y mentores.

## Objetivo de trabajo

Mantener BITIRO seguro, estable, pedagógicamente claro, accesible y fácil de ampliar.

## Reglas

- No modificar código durante una auditoría salvo autorización explícita.
- No asumir que un test exitoso demuestra que el comportamiento pedagógico es correcto.
- Diferenciar siempre:
  - hallazgo confirmado;
  - riesgo;
  - recomendación.
- Todo hallazgo debe incluir evidencia concreta y rutas de archivos.
- Leer únicamente los archivos necesarios para la tarea actual.
- No explorar el repositorio completo si existe contexto suficiente.
- No leer ni mostrar `.env*`, secretos, claves o credenciales.
- No modificar migraciones, RLS ni datos de Supabase sin autorización explícita.
- No hacer push ni merge sin autorización.
- No instalar dependencias sin autorización.

## Verificación

Comandos principales:

- `pnpm check`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm verify`

Antes de dar una modificación por terminada, ejecutar solamente las pruebas relevantes y ampliar a la suite completa cuando corresponda.

## Auditoría

Los resultados persistentes se guardan en:

`docs/audit/`

Cada fase debe reutilizar esos documentos en vez de volver a investigar todo el proyecto.

## Contexto compacto

Existe un mapa estructural generado con Repomix.

Usarlo solo cuando una tarea necesite comprender relaciones generales del repositorio. Para debugging o implementación, leer directamente los archivos fuente relevantes.

# BITIRO Lab v6.5 — Laboratorio integrado (entrega de desarrollo, no piloto certificado)

## Qué quedó implementado en este paquete

- Preserva cuentas BITIRO, Mustakis, registro obligatorio, roles por cohorte, códigos de participantes, bloqueo por mentor y Cloud Learning v6.4.3.
- **Modo foco:** oculta/restaura el editor sin borrar ni reemplazar su estado. Preferencia en `sessionStorage`; atajo `Ctrl + \\`; fullscreen por API estándar con salida explícita. El RuntimeBar permite detener el programa aun cuando el editor está oculto.
- **Vista 3D de base:** pista horizontal en perspectiva, líneas, bases, cajas, robot 3D simplificado, ruedas y placa; órbita con mouse/teclado, zoom, cámara superior y seguimiento del robot. Canvas2D hace una proyección geométrica tridimensional sin dependencias adicionales. El motor físico y el runtime son los mismos que alimentan 2D; no se simula un segundo robot. La calibración obliga a usar 2D porque allí puede interactuarse con los sensores.
- **Evaluación formativa S01/S02:** registros de lecturas IR, lecturas de sensores de línea, trayectoria, golpe, intersección y parada según misión. Requiere la secuencia del programa; arrastrar manualmente a la base no marca una práctica como superada. Se muestra lista de objetivos; se registra la práctica autoevaluada en nube tras pasar las condiciones.
- **Mentor:** columna de sesiones visitadas, intentadas y superadas **en el simulador**, sin exponer código privado al mentor. La RPC de base continúa verificando cohorte y publicación para todas las escrituras.
- Nuevas pruebas unitarias del evaluador y pruebas SQL de acceso al resultado formativo.

## Condiciones y límites que NO deben presentarse como terminados

- El IROH 3D actual es un **modelo geométrico simplificado**: no es la réplica final del hardware ni un renderer comercial optimizado; requiere medidas/fotos/modelo autorizados y evaluación visual en dispositivos de alumnos.
- **S03–S08 siguen sin simulación completa**, porque este paquete solo posee geometría interactiva validada S01/S02; existen imágenes de origen de S03–S06/S08 en `docs/protected-source`, pero no se han validado sus cotas, tareas ni criterios de aprobación. No se deben exponer como sesiones interactivas sin su desarrollo.
- **Resultado `completed` es formativo y declarado desde un navegador bajo control del alumno**. SQL valida esquema/rol/cohorte/publicación, pero **NO** reejecuta de manera confiable el programa en el servidor ni constituye calificación oficial. No utilizar en decisiones de certificación o clasificación sin verificación del lado servidor o del mentor.
- No se han validado en este entorno build, Playwright ni PGlite con dependencias instaladas. Deben ejecutarse en WSL antes de actualizar el proyecto remoto.
- No usar credenciales de niños reales en dev; revisar protección de datos, correos/consentimiento institucional y mecanismos de borrado antes del piloto.

## Migraciones Supabase nuevas respecto de v6.4.2

Si la base remota aún NO tiene `202609190001_cohort_learning.sql`, el `dry-run` debe listar dos migraciones, **en este orden**:

```
202609190001_cohort_learning.sql
202609190002_formative_missions.sql
```

Si ya tiene v6.4.3 aplicada, aparecerá solamente `202609190002_formative_missions.sql`.

```
pnpm verify
pnpm dlx supabase@latest link --project-ref <TU_PROJECT_REF>
pnpm dlx supabase@latest db push --dry-run
pnpm dlx supabase@latest db push
```

No ejecutar `seed.demo.sql` ni volver a crear cohortes/códigos. Copiar `.env.local` **solo localmente** desde tu instalación actual; no está en el ZIP. El ZIP no contiene claves ni contraseñas.

## Pruebas en el navegador para la entrega

1. Como participante con S01 publicada: ejecutar programa de referencia y observar checklist; cambiar a 3D, orbitar, activar seguimiento, volver a 2D y calibrar.
2. Activar `Ocultar código`, revisar que canvas use toda el área y que puedas pausar/detener/reiniciar; restaurar editor y confirmar que tu fuente persiste.
3. Ejecutar el desafío S01 hasta los criterios: debe mostrar `Superada en simulador` y luego sincronizar. **No** debe completarse por entrar con arrastre en una zona.
4. Ver en mentor el resumen de actividad como *autoevaluación*, no calificación formal.
5. Ocultar S01 con el mentor, refrescar como participante y confirmar que no se abre por URL directa ni se puede sincronizar progreso de esa sesión.
6. Ejecutar toda la suite de pruebas y comprobar errores/advertencias reales antes de usar con alumnos.

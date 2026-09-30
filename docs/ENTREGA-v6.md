# Entrega BITIRO Lab 6.0

Verificada localmente el 18 de septiembre de 2026 con Windows, Microsoft Edge, Node 24.19 y Vite 7.3.5. Los archivos originales 5.5 se conservan aparte.

## Resultado

Nueva interfaz de ruta, laboratorio, recursos, sedes y cuentas; registro abierto por sede integrado con Supabase; administración paginada y permisos protegidos en PostgreSQL. La paleta de papel, tinta y cobre, las tipografías locales y la composición editorial conservan protagonismo del robot y del código.

## Evidencia de validación

| Comprobación | Resultado y alcance |
| --- | --- |
| TypeScript y build | Sin errores. Build listo en `dist`. |
| Pruebas unitarias | 88 aprobadas, incluidos runtime, parser, física, límites y separación del almacenamiento por usuario. |
| PostgreSQL/RLS | 31 comprobaciones aprobadas en PGlite: escalada de rol, acceso por sede, código ajeno, paginación, búsqueda, concurrencia de revisiones y auditoría. La protección concurrente del último administrador usa bloqueo transaccional; la suite valida la degradación del último administrador, no una carga concurrente de producción. |
| Navegador | 15 escenarios aprobados. Se repitieron los 6 de plataforma después del ajuste final de estilos y de espera de carga; 6/6 aprobados. |
| Accesibilidad automatizada | Sin infracciones detectadas por axe en ocho rutas públicas a 1440, 390 y 320 px, y en laboratorio a 1440 y 390 px. Incluye reglas WCAG A/AA disponibles en axe; no equivale a una certificación completa ni a una auditoría con lector de pantalla. |
| Diseño | Capturas revisadas de ruta, registro, laboratorio y móvil. Sin desbordamiento horizontal en los tamaños probados. Calibración utilizable a 1280×600; no se ocultan las filas de sensores. |
| Resiliencia | Fallos forzados de carga de ruta, editor y Worker muestran recuperación; el código permanece local. |
| Dependencias | `pnpm audit`: cero vulnerabilidades conocidas en la consulta registrada. Se actualizaron Vite, Vitest y esbuild. El override esbuild 0.28.1 fue validado con build y pruebas. |
| Encabezados | CSP aplicada, nosniff, anti-iframe, políticas de referer/permisos, caché y compresión en servidor local; configuración equivalente incluida para hosting. |

## Rendimiento comprobado

La portada no solicita el módulo Monaco/CodeEditor ni el Worker del simulador. El módulo del editor pesa aproximadamente 2,30 MB sin comprimir / 597 kB gzip y se solicita al abrir una sesión; el módulo principal ronda 529 kB / 157 kB gzip. El laboratorio y el editor tienen cargas y recuperaciones separadas. El motor deja de programar pasos al detenerse y el canvas dibuja por cambios o animación activa. El servidor local ofrece Brotli/gzip y assets con hash.

No se publican puntuaciones Lighthouse ni Core Web Vitals de campo: no se ha medido tráfico real en `nulljinx.com`. Queda por medir LCP, INP y CLS bajo redes/dispositivos representativos al publicar. La advertencia de tamaño del módulo Monaco es conocida y queda documentada; su descarga diferida se comprueba en navegador.

## Pendiente de operación real

Conectar proyecto Supabase, SMTP y hosting, ejecutar migración y seed, registrar el primer administrador, configurar URLs y DNS y probar confirmación/recuperación con cuentas controladas. Las pruebas locales de interfaz sin proveedor y SQL embebido no verifican correo ni GoTrue/PostgREST de una instalación remota. No se ha publicado ni creado una cuenta en nombre del usuario.

El código todavía se guarda solo en el navegador. S01 es el único simulador interactivo; las siete sesiones restantes tienen material/editor. El administrador actual es global. Cohortes, inscripción institucional validada, sincronización de trabajos, aislamiento entre administradores de distintas instituciones y simuladores restantes son incrementos separados documentados en la arquitectura.

## Capturas

- [Ruta de aprendizaje](capturas-v6/explorer.png)
- [Registro por sede](capturas-v6/register.png)
- [Laboratorio S01](capturas-v6/lab.png)
- [Ruta en móvil](capturas-v6/mobile.png)
- [Laboratorio en móvil](capturas-v6/lab-mobile.png)
- [Calibración en pantalla de poca altura](capturas-v6/calibracion-1280x600.png)

Consulta [Seguridad y despliegue](SEGURIDAD-Y-DESPLIEGUE.md) para habilitar cuentas. El catálogo de sedes y las referencias de diseño están documentados en [Referencias y decisiones](REFERENCIAS-Y-DISENO.md).

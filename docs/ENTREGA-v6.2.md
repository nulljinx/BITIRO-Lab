# BITIRO Lab 6.2 — corte de entrega

## Implementado

- landing general BITIRO;
- cuenta independiente de una institución;
- página Mis espacios;
- redención de código institucional;
- workspace personalizado Fundación Mustakis;
- enlaces institucionales externos;
- relación organización → programa → sede → cohorte;
- rol de mentor separado del rol global de plataforma;
- liberación de sesiones por cohorte;
- bloqueo de navegación directa a contenido no liberado;
- rate limit de redención en base de datos;
- modo demo local sin Supabase;
- migración de registro para eliminar sede obligatoria;
- materiales S03–S08 fuera del directorio público;
- pruebas SQL ampliadas para códigos, releases y permisos;
- E2E local para desbloqueo y ruta bloqueada.

## No implementado todavía

- generación/revocación de códigos desde la UI;
- logo oficial de Fundación Mustakis provisto por la institución;
- almacenamiento privado de materiales curriculares futuros;
- panel de analítica/progreso del mentor;
- sincronización cloud de código;
- modo foco;
- simulador 3D;
- S03–S08 interactivas.

## Decisión de arquitectura

El 3D futuro será un renderer del estado de `SimulationEngine`; no contendrá la lógica del runtime Arduino, sensores ni reglas físicas. Esto permite conservar la vista técnica 2D y añadir perspectiva, cámara libre o seguimiento del robot sin duplicar el motor.

## Límite de protección del cliente

El release gate evita que un participante abra una sesión bloqueada desde la interfaz o escribiendo su URL. S01/S02, sin embargo, continúan en el bundle porque la simulación es client-side. Los materiales futuros que requieran confidencialidad previa a clase deben servirse desde almacenamiento privado/API tras autorización.

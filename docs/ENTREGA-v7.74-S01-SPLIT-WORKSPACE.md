# BITIRO Lab v7.74 — S01 Split Workspace

## Objetivo
Convertir S01 en un espacio de trabajo de escritorio real: simulador y código visibles simultáneamente para reducir el ciclo **programar → probar → observar → corregir**.

## Cambios
- Split desktop desde 1180 px: simulador a la izquierda y editor a la derecha.
- El workspace usa el alto disponible del viewport y evita el scroll largo de página en escritorio.
- Telemetría permanece dentro del simulador con scroll propio cuando sea necesario.
- Monaco ocupa el espacio flexible del panel derecho.
- `Probar código` permanece en la parte inferior del editor.
- `Misión y funciones` ya no crea un scrollbar interno; sus tres objetivos crecen dentro del panel.
- Se compactaron toolbar, runtime, feedback y estados cloud para reservar espacio al trabajo real.
- `Ocultar código` mantiene el modo de simulación enfocada.
- Tablet y móvil conservan el flujo anterior por pestañas/vertical.

## No modificado
- Física, runtime ni evaluación de S01.
- Supabase/RLS.
- Contenido de la misión.
- Vista de calibración.

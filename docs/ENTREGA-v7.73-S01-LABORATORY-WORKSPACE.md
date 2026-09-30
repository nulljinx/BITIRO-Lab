# BITIRO Lab v7.73 — S01 Laboratory Workspace

## Objetivo
Reducir el desplazamiento vertical de S01 y acercar el ciclo **programar → probar → observar → corregir** en escritorio, sin cambiar la física ni la lógica de la misión.

## Cambios
- Escritorio desde 1280 px: simulador y editor conviven en dos columnas dentro del viewport de trabajo.
- Cabecera de misión más compacta.
- Controles de cámara unificados en la barra del simulador: **Superior · Perspectiva · Seguir IROH**.
- Se elimina la fila duplicada `Vista superior / Vista 3D` y los presets flotantes del visor 3D.
- Encuadre 3D inicial más cercano para dar mayor presencia a la pista e IROH.
- Barra de ejecución, feedback, objetivos, telemetría y acciones del editor más compactas en escritorio.
- Entre 1024 y 1279 px se conserva el flujo apilado para evitar comprimir demasiado el editor.
- Tablet y móvil mantienen el flujo por pestañas existente.

## No se modifica
- Física del robot.
- Evaluación de misión.
- Runtime de Arduino/IROH.
- Permisos de mentor/participante.
- Integración Supabase.

## Verificación
- `tsc --noEmit`: OK.
- Build de producción Vite: OK.
- 14 pruebas focalizadas de viewport, tracks y referencia S01: OK.

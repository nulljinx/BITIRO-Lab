# BITIRO Lab v7.16 — Calibración guiada y umbrales consistentes

## Objetivo
Convertir la calibración de los tres sensores de línea en un flujo comprensible para estudiantes y hacer que los umbrales guardados sean utilizados de manera consistente por el simulador.

## Cambios de interfaz
- Flujo visible de 3 pasos: **Blanco → Línea negra → Revisar**.
- Instrucción dinámica según el paso en curso.
- La tabla ahora usa las etiquetas educativas **Blanco / Negro / Umbral** en lugar de Mín. / Máx.
- Explicación breve de qué representa el umbral.
- Panel derecho más compacto para reducir el scroll en pantallas de escritorio.
- El botón activo ahora dice **Salir de calibración** y gana contraste.
- Confirmación de guardado muestra los tres umbrales aplicados.

## Cambios técnicos
- Se añadió el comando interno `set-line-thresholds`.
- Los umbrales guardados se cargan y envían al motor de simulación cuando el worker está listo.
- La detección interna de línea deja de depender exclusivamente del valor fijo 200.
- El evaluador de intersecciones usa el umbral calibrado de cada sensor.
- Los indicadores de los sensores en la vista 3D usan también los umbrales guardados.
- Las lecturas ADC siguen siendo crudas: calibrar no modifica los valores 0–1023 que recibe el programa del alumno.

## Compatibilidad
- El valor por defecto continúa siendo 200 si no existe calibración guardada.
- Se mantiene la clave de almacenamiento de calibración existente para no perder referencias ya guardadas.
- El test e2e existente conserva la frase `Referencias guardadas` en la confirmación.

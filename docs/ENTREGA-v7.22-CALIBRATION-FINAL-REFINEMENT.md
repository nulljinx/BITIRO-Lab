# BITIRO Lab v7.22 — Calibration final refinement

## Objetivo
Cerrar la pantalla de calibración con una secuencia pedagógica estricta y menos elementos redundantes.

## Cambios
- Los pasos de calibración ahora son realmente secuenciales: primero blanco, luego negro, después elección y comprobación del umbral.
- Las lecturas negras registradas antes de terminar el paso blanco no completan anticipadamente el paso 2.
- El umbral nuevo no se muestra como editable hasta que existe contraste suficiente entre blanco y negro.
- Mientras falta contraste se muestra, de forma secundaria, la calibración anterior (`Anterior ...`).
- Las dos tarjetas informativas de variación por zona y diferencia entre sensores se fusionaron en una sola tarjeta `Antes de elegir el umbral`.
- Se retiró el selector `Vista superior / Vista 3D` mientras se calibra.
- Se retiró el panel inferior redundante `Calibración en curso` durante calibración.
- La ayuda bajo la pista se redujo a `Flechas = ajuste fino`.
- Los mensajes pendientes ahora distinguen entre `Falta medir blanco` y `Falta medir negro`.

## Sin cambios
- Calibración independiente por sensor.
- Variación espacial de lecturas.
- Aplicación de umbrales al motor y evaluación.
- Guardado y retorno automático al simulador 3D.
- Código del alumno y estado del editor.

# BITIRO Lab v7.17 — Umbral como aprendizaje

## Objetivo
Transformar la calibración de sensores de línea desde una herramienta de configuración en una actividad pedagógica breve: observar, comparar, elegir, comprobar y llevar la decisión al código.

## Flujo guiado
1. **Blanco** — medir la lectura de la superficie clara.
2. **Negro** — medir la lectura de la línea.
3. **Elegir** — definir un umbral entre ambas lecturas o usar la recomendación de BITIRO.
4. **Probar** — comprobar que el valor elegido separa correctamente blanco y negro.
5. **Código** — ver la relación entre lectura ADC, umbral y una condición `if`.

## Cambios funcionales
- El valor recomendado sigue siendo el punto medio entre blanco y negro, pero ya no se presenta como una respuesta automática que basta con guardar.
- El alumno puede mover un control visual de umbral o editar el valor numérico.
- `Usar valores recomendados` mantiene una vía guiada para evitar frustración.
- `Comprobar mi umbral` valida que cada referencia quede entre las lecturas observadas de blanco y negro.
- `Guardar calibración` se habilita después de elegir y comprobar el umbral.
- Se muestra un ejemplo de código con `leerSensorLineaCentral()` y una condición `if (sensor > umbral)`.
- Las lecturas ADC no se alteran: la calibración define la frontera de interpretación, no modifica el sensor.

## Mantiene
- Persistencia local de los tres umbrales.
- Aplicación de los umbrales al motor, vista 3D y evaluador de misión introducida en v7.16.
- Movimiento por arrastre y teclado durante la calibración.
- Botones Inicio, Limpiar, rotación y guardado.

## Archivos principales
- `src/features/simulator/CalibrationPanel.tsx`
- `src/features/simulator/Simulator.tsx`
- `src/features/simulator/FeedbackPanel.tsx`
- `src/styles/workspace-advanced.css`
- `tests/e2e/premium.spec.ts`

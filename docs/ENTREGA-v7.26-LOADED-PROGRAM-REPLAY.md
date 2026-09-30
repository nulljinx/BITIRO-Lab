# BITIRO Lab v7.26 — Programa cargado y repetición de prueba

## Objetivo
Separar claramente **editar código** de **probar el código ya cargado**. El alumno puede ejecutar una versión, observarla varias veces y usar Pausar/Continuar/Detener/Reiniciar sin volver al editor a cargar la misma fuente.

## Flujo
1. El alumno edita el programa.
2. Pulsa **Cargar y ejecutar**.
3. Si el programa es válido, esa versión queda como **Código cargado**.
4. Desde el simulador puede:
   - Pausar / Continuar.
   - Detener, conservando el código cargado.
   - **Reiniciar prueba**, que restablece pista/robot/misión y vuelve a ejecutar desde el inicio exactamente la última versión cargada.
5. Si vuelve al editor y modifica el código, aparece **Cambios sin cargar**. Reiniciar sigue usando la versión anterior hasta pulsar de nuevo **Cargar y ejecutar**.

## Comportamiento importante
- **Revisar código** no reemplaza el programa cargado.
- Un intento nuevo con error de sintaxis tampoco reemplaza la última versión válida cargada.
- Reiniciar conserva las condiciones externas seleccionadas (por ejemplo IR/botón) y la calibración de sensores, pero reinicia posición, tiempo, LCD, obstáculos y evidencia de misión.
- El código cargado vive durante la sesión actual del laboratorio.

## Pruebas
Se añadió `src/tests/runtime/replay.test.ts` para comprobar que la misma fuente puede volver a ejecutarse desde la posición y tiempo iniciales.

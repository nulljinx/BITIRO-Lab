# BITIRO Lab v7.38 — Flujo de prueba simplificado

## Objetivo
Reducir el lenguaje técnico de “cargar programa” y separar claramente dos acciones para estudiantes: probar el código actual y repetir una prueba ya preparada.

## Cambios
- `Cargar y ejecutar` pasa a **Probar código**.
- `Ejecutar código cargado` pasa a **Probar otra vez**.
- `Reiniciar prueba` pasa a **Restablecer**.
- `Detener prueba` pasa a **Detener**.
- El estado del editor ahora usa lenguaje simple: **Listo para probar**, **En simulador**, **Cambios nuevos**.
- El indicador del simulador pasa de `Código cargado` a **Programa listo**.
- **Probar otra vez** reinicia internamente posición, tiempo, LCD y objetivos y vuelve a ejecutar en un solo clic, conservando la selección actual de IR/pulsador.
- **Restablecer** vuelve al inicio y apaga IR/pulsador para preparar un escenario distinto. El programa sigue disponible.
- La solución del mentor usa **Probar solución** en lugar de `Cargar y ejecutar`.

## Flujo para el estudiante
1. Escribe o modifica el código.
2. Pulsa **Probar código**.
3. Observa al IROH.
4. Pulsa **Probar otra vez** todas las veces que necesite.
5. Solo vuelve al editor cuando quiera cambiar el programa.

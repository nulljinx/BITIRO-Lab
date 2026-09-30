# BITIRO Lab v7.45 · E2E runtime contract

## Objetivo
Cerrar los tres fallos E2E restantes sin cambiar la lógica productiva del simulador.

## Correcciones
- `Revisar código` se valida por su estado semántico de éxito (`is-success`) y ausencia de diagnósticos, en vez de depender de una frase antigua de la interfaz.
- La recuperación después de un error/infinite loop usa el mismo contrato semántico.
- El escenario E2E `s01-left` activa explícitamente el estímulo **IR izquierdo** antes de ejecutar el programa de referencia. El fixture ya no presupone un IR activo al iniciar; producción mantiene ambos IR apagados por defecto.

## Regla
Los tests E2E deben preparar explícitamente estímulos externos (IR, pulsador, etc.) y verificar contratos de comportamiento, evitando acoplarse a copy no esencial.

# BITIRO Lab v7.27 — Replay controls y reinicio limpio

## Objetivo
Separar claramente **cargar una nueva versión del código** de **repetir una prueba con el código ya cargado**.

## Flujo nuevo
1. El alumno edita y pulsa **Cargar y ejecutar**.
2. Esa versión queda marcada como **Código cargado**.
3. Desde el simulador puede pausar, continuar o detener la prueba.
4. **Reiniciar prueba** vuelve el IROH al inicio, apaga ambos IR y libera el pulsador, pero conserva el código cargado.
5. El alumno vuelve a elegir los estímulos IR / pulsador que quiera probar.
6. **Ejecutar código cargado** inicia otra vez la misma versión sin volver a cargarla desde el editor.
7. Cuando modifica el programa, vuelve al editor y usa **Cargar y ejecutar** para sustituir la versión cargada.

## Cambios de interfaz
- El editor ya no sustituye `Cargar y ejecutar` por `Detener programa`.
- Detener la ejecución se hace desde los controles del simulador (`Detener prueba`).
- Tras reiniciar aparece `Ejecutar código cargado`.
- El estado informa que IR/pulsador pueden configurarse antes de repetir la prueba.

## Reinicio de entradas
- IR izquierdo: OFF
- IR derecho: OFF
- Pulsador: OFF
- pose, tiempo, LCD, motores, Golpe y misión: reiniciados por el motor como antes.
- código cargado: se conserva.

## Validación realizada
- Validación sintáctica TypeScript/TSX de los archivos modificados mediante TypeScript 5.8.3.
- Se añadió una prueba de runtime que comprueba que un reset limpia IR/pulsador y que luego puede configurarse otro estímulo antes de volver a ejecutar la misma fuente.
- No se ejecutó la suite Vitest completa porque el ZIP de trabajo no contiene `node_modules`.

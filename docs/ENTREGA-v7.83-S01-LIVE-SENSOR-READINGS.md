# BITIRO Lab v7.83 — S01 Live Sensor Readings

## Cambio

- La telemetría de sensores de línea muestra `0` mientras el programa no está ejecutándose.
- Al pulsar **Probar código** y entrar al estado `running`, aparecen las lecturas reales.
- Al detener, reiniciar, pausar o terminar la ejecución, la telemetría vuelve a `0`.
- El modo **Calibración S01** conserva sus lecturas en vivo, porque allí medir el sensor central es parte explícita de la actividad pedagógica y no depende de ejecutar el programa del alumno.

## Motivo pedagógico

La telemetría normal representa lo que el programa está observando durante su ejecución. Evita mostrar datos ambientales antes de comenzar la actividad y diferencia claramente la calibración guiada del runtime del programa.

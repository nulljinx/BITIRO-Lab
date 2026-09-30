# BITIRO Lab v7.39 — S03 runtime + calibración estable

## Corrección del IROH detenido en S03
La pista oficial S03 pasa muy cerca del borde inferior. El motor de física estaba tratando el papel como si fuera una pared y exigía que todo el radio del robot permaneciera dentro del plotter. El IROH avanzaba unos centímetros y luego cada paso era rechazado aunque los motores siguieran activos.

Se corrigió el modelo: el plotter es una lámina, por lo que el chasis puede sobresalir parcialmente. Solo se considera fuera de pista cuando el centro del robot sale del área impresa.

## Solución de mentor S03
Se reforzó el seguidor de línea de referencia con correcciones más marcadas y una variable de estado `ultimoGiro` para recuperar la línea si temporalmente los tres sensores ven blanco. Se mantienen los contenidos trabajados hasta S03: tres sensores, variables de estado, sonar, contador, LCD, `while` e intersecciones.

## Calibración
- La calibración usa un encuadre independiente y fijo (92 %) para mantener siempre la pista completa visible.
- Mover el IROH durante la calibración ya no puede heredar ni alterar el zoom de la vista 3D.
- Los controles de zoom se ocultan mientras se calibra para evitar cambios accidentales.
- Al salir de calibración, la vista normal conserva su propio flujo de zoom.

## Pruebas de regresión
- El runtime acepta la solución de referencia S03.
- En simulación directa, el IROH avanza más de 20 cm durante los primeros 6 s sin colisión de borde.
- El primer obstáculo puede ser detectado por sonar durante la ejecución de la solución de referencia.

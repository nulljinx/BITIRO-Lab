# BITIRO Lab v7.37 — Soluciones mentor S01/S02 + corrección de ejecución

## Corrección crítica
La posición inicial de S03 introducida al aumentar la distancia al primer obstáculo quedó ligeramente fuera del margen físico permitido por el radio del IROH. El programa podía quedar en estado `running` y los motores recibir velocidad, pero cada paso de física era rechazado por estar fuera del tablero.

Se corrigió de dos formas:
1. S03 inicia ahora en una posición anterior de la línea con margen físico válido.
2. `SimulationEngine.reset()` normaliza de forma defensiva cualquier posición inicial para mantener la huella completa del robot dentro de la pista.

## Soluciones privadas para mentor
Se agregaron soluciones de referencia para S01 y S02, además de S03.

- **S01:** IR inicial, variable de estado, LCD, sensor central, sonar para aproximación al obstáculo y mecanismo Golpe. No usa contador, `while` ni seguidor de tres sensores.
- **S02:** variables de estado, tres sensores, intersección y elección de Base 1/2/3 mediante IR. No usa contador ni `while`.
- **S03:** mantiene contador, `while`, sonar, tres sensores e intersecciones.

El panel mentor incorpora también **Cargar y ejecutar**, además de copiar o cargar solo en el editor.

## Verificación local
Se compiló de forma aislada el núcleo TypeScript del simulador y las tres soluciones fueron aceptadas por el parser/runtime. Un harness de ejecución confirmó que S03 avanza físicamente tras cargar la solución (antes permanecía inmóvil).

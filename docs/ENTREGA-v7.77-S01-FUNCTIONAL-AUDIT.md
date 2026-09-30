# BITIRO Lab v7.77 — Auditoría funcional S01

## Corrección crítica
La referencia docente S01 era aceptada por el parser, pero no completaba físicamente el desafío: intentaba accionar Golpe demasiado lejos de la caja, marcaba `cajaMovida` y luego el robot quedaba bloqueado contra el obstáculo.

La referencia se reemplazó por una solución de estado simple que:
- valida que al inicio esté activo exactamente uno de los IR;
- anuncia IZQ/DER en LCD;
- sigue la pista con el sensor central;
- espera a que la caja esté dentro del alcance real del brazo;
- mueve la caja al lado contrario;
- llega a la base correspondiente;
- se detiene cuando el usuario activa ambos IR al final.

No usa `while`, contadores ni seguidor de tres sensores, preservando la progresión pedagógica de S01.

## Instrucciones S01
La telemetría y el feedback ahora explican el estado del estímulo externo:
- antes de ejecutar: activar solo IZQ o DER;
- durante el recorrido: se muestra la ruta esperada y el lado contrario del golpe;
- al llegar a la base: se indica activar ambos IR para comprobar la detención final.

## Cobertura añadida
La suite ejecuta la referencia docente completa para ruta izquierda y derecha, exige:
- llegada física a la base correcta;
- caja movida al lado contrario;
- cero colisiones;
- los cuatro criterios formativos completos;
- tiempo simulado inferior a un minuto.

También comprueba que un escenario inicial inválido no elija una ruta silenciosamente.

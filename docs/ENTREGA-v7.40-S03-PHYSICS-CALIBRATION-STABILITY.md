# BITIRO Lab v7.40 — S03 Physics + Calibration Stability

## Origen
Correcciones realizadas sobre el ZIP entregado por el usuario (`BITIRO-Lab.zip`, v7.39).

## Problemas confirmados
1. Los obstáculos de S03 estaban configurados como `movable:false` y `blocking:false`, por lo que el IROH podía atravesarlos.
2. El sonar se modelaba como un rayo infinitamente fino. En curvas podía no detectar una caja hasta quedar demasiado cerca.
3. La solución de mentor de S03 contaba obstáculos, pero no inicializaba ni utilizaba el mecanismo Golpe.
4. La evaluación de un giro de 180° dejaba de seguir el giro en cuanto los sensores rotaban fuera de la franja negra.
5. La vista de calibración podía crecer junto con el panel pedagógico; el ajuste de pista se recalculaba y daba la sensación de un zoom enorme.

## Correcciones
- S03 inicia con tres cajas físicas, bloqueantes y desplazables.
- El sonar usa un cono determinista muestreado de ±30° en vez de un único rayo.
- Las cajas ya despejadas por Golpe siguen visibles y animadas, pero no vuelven a bloquear ni a aparecer como un nuevo obstáculo del sonar.
- La solución de mentor S03 usa `inicializarGolpe()` y el movimiento de abanico visto en la sesión.
- El rango de sonar de la referencia vuelve al ejemplo pedagógico `> 5 && < 12`.
- La referencia usa un seguidor de línea de tres sensores con recuperación del último lado visto.
- El evaluador mantiene el seguimiento del giro de 180° por proximidad a la intersección aunque los sensores dejen de ver negro durante la rotación.
- En el escenario fijo, la misión registra tres respuestas válidas de 180° durante la ejecución.
- Las intersecciones siguen siendo franjas horizontales; se ensanchan levemente a 3,4 cm para que L/C/R puedan reconocerlas de forma robusta al llegar con ángulo.
- La calibración usa zoom independiente (90%), un máximo físico de escala y un panel de altura acotada; mover el IROH no puede agrandar progresivamente la pista.

## Validación realizada
Se ejecutó un harness determinista del runtime con la solución de mentor S03:
- compila sin diagnósticos;
- detecta 3/3 obstáculos;
- desplaza físicamente las 3 cajas;
- LCD termina en 3;
- registra 3/3 respuestas de 180°;
- completa los cuatro criterios formativos en ~87,4 s simulados;
- no cuenta dos veces el mismo obstáculo.

También se compiló `src/main.tsx` con esbuild para validar sintaxis/importaciones internas de los cambios. No se ejecutó la suite completa de Vitest porque el ZIP recibido conserva el almacén `.pnpm`, pero no todos los enlaces superiores de `node_modules` necesarios para ejecutar el runner directamente.

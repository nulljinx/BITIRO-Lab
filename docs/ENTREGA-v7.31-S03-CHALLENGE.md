# BITIRO Lab v7.31 — S03 Challenge

## Base pedagógica
Implementación de S03 a partir de los archivos oficiales entregados por el usuario:
- `ROB-002-S03-plotter-100x180.pdf`
- `ROB-002-S03-Slide-2025.pptx`

La sesión trabaja contadores, ciclo `while`, seguidor de línea con tres sensores, sonar y respuesta ante intersecciones.

## Cambios
- S03 pasa a ser una sesión interactiva.
- Plotter S03 digitalizado a 100 × 180 cm desde el PDF aportado.
- Editor inicial deliberadamente vacío: solo `#include`, `setup()` y `loop()`. No se entrega la solución.
- Pantalla **Preparar desafío** con 3 obstáculos y 3 intersecciones.
- Se incluye una distribución sugerida, pero el estudiante/mentor puede limpiar y recolocar los seis elementos haciendo clic sobre la pista.
- Las intersecciones agregadas forman cruces negros que afectan realmente las lecturas de los sensores.
- Los obstáculos S03 funcionan como objetivos de detección de sonar sin bloquear físicamente el recorrido, para evaluar conteo sin añadir una exigencia de Golpe que no aparece en la pauta final de S03.
- Evaluación formativa S03:
  1. lectura de los tres sensores y recorrido de la pista;
  2. detección de 3 obstáculos;
  3. LCD mostrando el total 3;
  4. respuesta a 3 intersecciones distintas con cambio de sentido cercano a 180°.
- La Guía incorpora recordatorios conceptuales aislados sobre contador, `while` y rango de sonar, sin código solución del desafío.

## Limitaciones actuales
- Los obstáculos configurables de S03 son objetivos virtuales de sonar y no colisionan con el chasis. Esto evita introducir como requisito oculto el uso de Golpe, que no forma parte de los criterios finales de evaluación del desafío S03.
- El plotter fue vectorizado desde la imagen del PDF; no se presenta como archivo CAD ni medición oficial del trazado impreso.
- No se ejecutó el build completo porque este paquete no incluye `node_modules`. Se verificó sintaxis de los archivos TypeScript/TSX modificados con TypeScript `transpileModule`.

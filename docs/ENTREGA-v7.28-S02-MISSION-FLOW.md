# BITIRO Lab v7.28 — S02 Mission Flow

## Objetivo
Completar el flujo pedagógico y de evaluación de S02 sin alterar la lógica estable de S01.

## Cambios
- S02 usa una zona de misión específica para la intersección central; las líneas transversales de inicio o de las bases ya no pueden contar como intersección.
- La detención del cruce requiere al menos 0,3 s dentro de la intersección real.
- Los objetivos de misión indican dinámicamente la base esperada según la combinación IR inicial.
- Feedback previo a ejecutar: DER → Base 1, IZQ → Base 2, ambos → Base 3.
- Tras Reiniciar prueba los IR quedan apagados y el feedback invita a elegir un nuevo escenario, aprovechando el código ya cargado.
- El código inicial de S02 incluye `esInterseccion()` como ejemplo real de `&&`, manteniendo la elección de ruta como tarea del alumno.
- Se añadieron pruebas de geometría de intersección y de los tres escenarios IR.
- El inspector IR de S02 muestra siempre el escenario: pendiente si no hay señal y verde cuando hay Base 1/2/3 seleccionada.

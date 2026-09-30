# BITIRO Lab v7.3 — Integrated Simulator Visual Pass

## Alcance
Esta entrega trabaja **el simulador integrado dentro de BITIRO Lab**, es decir, el que usa el alumno autenticado desde su sesión institucional. No corresponde al simulador autónomo.

## Cambios visuales
- La vista 3D queda seleccionada por defecto al entrar al simulador.
- Se mantiene la vista superior 2D para calibración y diagnóstico.
- El modelo procedural del IROH se enriqueció visualmente con:
  - ruedas amarillas tridimensionales con banda y cubo;
  - chasis de dos niveles;
  - separadores metálicos;
  - PCB y placa controladora;
  - LCD y pulsador;
  - soporte azul del sonar;
  - dos transductores frontales;
  - tres módulos de sensores de línea;
  - módulos IR frontales;
  - servo y varilla de Golpe ligados al ángulo real del motor de simulación.
- Se mejoró la pista 3D con base física, marco, retícula técnica y mayor profundidad visual.
- Se mejoraron los controles de cámara y el tratamiento oscuro del viewport 3D.
- Se añadió una superposición instrumental discreta dentro de la escena.

## Lo que NO cambia
- Supabase, autenticación, grupos y permisos.
- Motor de simulación y física.
- Sensores y evaluación de misión.
- Intérprete Arduino/C++.
- Guardado de código y progreso.

## Nota
El IROH sigue siendo un modelo procedural aproximado. Esta pasada busca evaluar primero el aspecto visual del simulador integrado antes de ajustar medidas físicas, sensores, criterios de misión y diseño fino del laboratorio.

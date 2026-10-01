# BITIRO Lab v7.84 — S02 Class Alignment

Esta entrega alinea la Sesión 02 del simulador con el material oficial de la clase y con el criterio pedagógico ya aplicado en S01.

## Enfoque pedagógico

- `setup()` queda reservado a inicializaciones.
- La elección de base se realiza en `loop()` con variables de estado.
- IR activo mantiene la convención `1`; inactivo, `0`.
- La solución del mentor usa los contenidos trabajados en S02: tres sensores de línea, tres umbrales, variables de estado, intersección y selección de base.
- Los cuatro casos explícitos del seguidor son: centro → avanzar, derecha → girar derecha, izquierda → girar izquierda, tres sensores en negro → intersección.
- El mentor no recibe abstracciones innecesarias ni funciones auxiliares que el grupo todavía no necesita para resolver la actividad.

## Desafío y evaluación

- IR derecho → Base 1.
- IR izquierdo → Base 2.
- Ambos IR → Base 3.
- El IROH se detiene un instante en la intersección, toma la rama elegida y se detiene en la base final.
- El evaluador usa la posición de los sensores delanteros para reconocer intersección y llegada a la base, coherente con el modo en que el robot detecta las franjas negras.
- El objetivo de seguimiento exige uso de los tres sensores y no registrar una pérdida sostenida de línea durante la ejecución.

## Telemetría S02

- Se mantienen L / C / R, porque los tres sensores son parte central de la sesión.
- Se eliminan Sonar, Pulsador/Golpe y la tarjeta amarilla de escenario, porque no participan en el desafío S02.
- Se elimina el indicador `GOLPE SIN INICIALIZAR` de la vista 3D de S02.

## Calibración S02

Flujo guiado específico para tres sensores:

1. registrar tres mediciones de blanco para I, C y D;
2. registrar tres mediciones de negro para I, C y D;
3. calcular manualmente un umbral para cada sensor;
4. comprobar los cuatro casos vistos en clase;
5. guardar y copiar `umbralI`, `umbralC` y `umbralD` al programa.

BITIRO valida que cada umbral quede entre la mayor lectura blanca y la menor lectura negra correspondiente, pero no recomienda la respuesta.

## Validación funcional ejecutada

La solución docente fue ejecutada sobre el motor real del simulador para los tres estímulos:

- Base 1: 4/4 objetivos, sin `LINE_LOST`, detenido en destino.
- Base 2: 4/4 objetivos, sin `LINE_LOST`, detenido en destino.
- Base 3: 4/4 objetivos, sin `LINE_LOST`, detenido en destino.

También se verificó regresión funcional de las soluciones de S01 y S03: ambas continúan completando 4/4 objetivos.

La sintaxis de los archivos TypeScript/TSX modificados fue verificada con TypeScript. La suite completa de Vite/Vitest no se ejecutó en esta copia porque no incluye `node_modules` y el entorno no puede descargar dependencias.

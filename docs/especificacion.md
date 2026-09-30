# IROH Lab — Especificación de implementación para Codex

## 0. Propósito de este documento

Este archivo define cómo implementar **IROH Lab**, un simulador web de robótica educativa orientado a estudiantes que participan en un taller de robótica con el robot **IROH**.

El producto debe permitir que un estudiante practique fuera de clase los desafíos vistos durante el taller, escribiendo código con sintaxis Arduino/C++ y usando las librerías propias del IROH, para luego observar el comportamiento del robot en una simulación 2D de las pistas reales.

La primera implementación funcional debe cubrir **Robótica Intermedia, sesiones 01 a 08**, pero la arquitectura debe quedar preparada desde el principio para incorporar posteriormente **Robótica Inicial, sesiones 01 a 08** sin rehacer el motor.

---

# 1. Fuentes de verdad

Codex debe usar las siguientes fuentes en este orden:

1. **Librerías reales del IROH suministradas por el usuario.**
   - Son la fuente de verdad para nombres de funciones, parámetros, rangos, comportamiento y sensores.
   - Los nombres de funciones que aparecen en los mockups Figma son ilustrativos hasta ser confirmados contra las librerías reales.
   - No inventar funciones de la API del IROH.

2. **Material de sesiones del Taller Intermedio ROB002.**
   - Archivos de actividades.
   - Presentaciones.
   - Plotters de las pistas.
   - Usarlos para definir objetivos, escenarios y reglas de cada desafío.

3. **Figma actual de IROH Lab.**
   - Archivo:
     `https://www.figma.com/design/246Vqfp58PjnddBhhwMHyX`
   - Vistas relevantes:
     - `IROH / Explorador de Sesiones`
     - `IROH / Simulador · Intermedio S01`
     - `IROH Learning Simulator v2` como referencia histórica.
   - La implementación debe respetar la estructura, jerarquía y lenguaje visual del diseño actual.

4. Este documento.

Si existe contradicción entre el mockup y las librerías reales del robot, **manda la librería real**.

---

# 2. Contexto del producto

IROH Lab está pensado para un taller de robótica educativa impartido a niños y adolescentes.

La experiencia pedagógica se divide en dos niveles:

- Robótica Inicial
- Robótica Intermedia

Cada nivel contiene 8 sesiones.

El estudiante debe poder:

1. Elegir nivel.
2. Elegir sesión.
3. Leer el desafío.
4. Ver la pista correspondiente.
5. Escribir código Arduino.
6. Ejecutar ese código contra un IROH virtual.
7. Observar:
   - movimiento,
   - sensores,
   - LCD,
   - obstáculos,
   - decisiones del programa.
8. Pausar, reiniciar y volver a ejecutar.
9. Abrir una ayuda contextual con conceptos vistos en la sesión.
10. Entender por qué el robot tomó una determinada decisión.

No debe sentirse como:
- un dashboard administrativo,
- un IDE profesional excesivamente técnico,
- un videojuego infantil,
- una plantilla genérica de IA.

Debe sentirse como un **producto educativo comercial, moderno y profesional**.

---

# 3. Alcance inicial

## MVP obligatorio

Implementar:

- Explorador de sesiones.
- Vista del simulador.
- Editor de código.
- Motor de simulación 2D.
- Modelo del robot IROH.
- Lectura simulada de sensores.
- Ejecución controlada de un subconjunto Arduino/C++.
- Compatibilidad con las funciones necesarias de la librería IROH.
- Robótica Intermedia:
  - S01
  - S02
  - S03
  - S04
  - S05
  - S06
  - S07
  - S08
- Ayuda y conceptos.
- Estado de sensores en tiempo real.
- Persistencia local del código del estudiante.
- Reiniciar, ejecutar, pausar y cambiar velocidad.
- Diseño responsive para escritorio/laptop.

## Fuera del MVP, pero dejar arquitectura preparada

- Robótica Inicial S01–S08.
- Inicio de sesión.
- Sincronización en la nube.
- Dashboard de profesores.
- Estadísticas por sede.
- Rankings.
- Multijugador.
- Evaluación automática oficial.
- Compilación Arduino completa.
- Integración con hardware físico.
- Subida directa del código al IROH real.

No implementar estas funciones sin que sean solicitadas.

---

# 4. Stack recomendado

Si el repositorio está vacío, usar:

- **React**
- **TypeScript**
- **Vite**
- **CSS Modules, Vanilla Extract o CSS moderno con variables**
- **Monaco Editor** para el código
- **HTML Canvas 2D** para la simulación
- **Web Worker** para el motor de simulación
- **Vitest** para pruebas unitarias
- **Playwright** para E2E

No es necesario usar WebGL en la primera versión.

Canvas 2D es suficiente y permite:
- pistas,
- líneas,
- sensores,
- obstáculos,
- robot,
- animaciones,
- depuración visual.

Evitar:
- `eval`
- `new Function`
- ejecución directa de código arbitrario del usuario
- SVG dibujado manualmente para la interfaz

Los plotters pueden convertirse a geometría interna, pero el render principal de la pista debe realizarse en Canvas.

---

# 5. Identidad visual

## Tipografía

UI:
- IBM Plex Sans

Código y telemetría:
- IBM Plex Mono

## Colores base

```css
--surface-page: #F3F6FB;
--surface-card: #FFFFFF;
--text-primary: #182235;
--text-secondary: #66758A;
--border: #D8E0EC;

--brand-purple: #6D5DFB;
--brand-purple-soft: #EEF0FF;
--brand-yellow: #F6C94C;

--success: #35B980;
--success-soft: #ECFBF4;

--code-bg: #0D1424;
--code-panel: #131C30;

--cyan: #55D6E6;
--danger: #EF6A6A;
--warning: #F0A66A;
```

## Reglas UI

- esquinas redondeadas;
- jerarquía clara;
- espacios generosos;
- elementos interactivos fáciles de reconocer;
- no saturar de controles;
- no mostrar opciones que el alumno todavía no necesita;
- botones principales grandes y claros;
- feedback inmediato después de ejecutar;
- evitar terminología demasiado técnica cuando exista una explicación más simple.

---

# 6. Arquitectura de experiencia

## 6.1 Explorador de sesiones

Ruta sugerida:

```txt
/intermedio
```

Contenido:

### Header

- IROH LAB
- Simulador de Robótica Educativa
- Nivel actual: `Robótica Intermedia`
- Botón `Guía y conceptos`

### Hero

Título:

> Elige una sesión para practicar

Subtítulo:

> Repite los desafíos vistos en clases, programa al IROH y prueba tu solución tantas veces como necesites.

### Progreso

Mostrar:

```txt
1 de 8 sesiones exploradas
```

No implementar gamificación compleja todavía.

### Tarjetas

Mostrar S01–S08.

Cada tarjeta debe tener:

- número de sesión;
- nombre;
- resumen;
- miniatura de pista;
- conceptos;
- botón `Abrir`.

S07:
- mostrar `REPASO`;
- indicar `Sin plotter obligatorio`.

---

# 7. Vista del simulador

Ruta sugerida:

```txt
/intermedio/:sessionId
```

Ejemplo:

```txt
/intermedio/s01
```

La pantalla debe tener 3 zonas principales.

## 7.1 Header

Debe mostrar:

- volver a sesiones;
- nivel;
- sesión actual;
- progreso;
- Guía y conceptos.

## 7.2 Editor de código

Panel izquierdo.

Debe incluir:

- nombre del archivo;
- estado:
  - listo;
  - ejecutando;
  - error;
- Monaco Editor;
- funciones útiles para la sesión;
- objetivos mínimos del programa;
- botón:
  - `Revisar código`;
- botón principal:
  - `Ejecutar en simulador`.

El código debe persistirse por:

```txt
nivel + sesión
```

Ejemplo de key:

```txt
iroh-code-intermedio-s01
```

## 7.3 Simulación

Panel derecho.

Debe incluir:

- nombre del desafío;
- instrucciones breves;
- selector de pista si existen variantes;
- Canvas;
- panel contextual;
- sensores;
- LCD;
- estado del robot;
- controles:
  - Reiniciar
  - Velocidad
  - Pausar

## 7.4 Panel “¿Qué está pasando?”

Debe traducir el estado técnico a lenguaje pedagógico.

Ejemplo:

> Al iniciar, el IR izquierdo quedó activo. Tu programa debe recordar esa decisión, mostrarla en la LCD y mantener al IROH siguiendo la línea por el lado izquierdo.

No crear texto mediante IA en el MVP.

Usar reglas deterministas basadas en eventos del motor.

---

# 8. Robot IROH

El modelo inicial debe soportar, como mínimo:

- 2 motores;
- 2 ruedas motrices;
- 1 rueda/caster metálico;
- 3 seguidores de línea;
- 2 sensores IR;
- 1 sonar;
- LCD 16x2;
- pulsador.

Las librerías entregadas deben revisarse antes de cerrar la API simulada.

Si las librerías contienen servos u otros actuadores usados en los desafíos, agregarlos al modelo.

---

# 9. Modelo físico

Usar movimiento diferencial.

Estado mínimo:

```ts
interface RobotState {
  x: number;
  y: number;
  heading: number;

  leftMotor: number;
  rightMotor: number;

  lineLeft: number;
  lineCenter: number;
  lineRight: number;

  irLeft: boolean;
  irRight: boolean;

  sonarCm: number;

  lcd: [string, string];

  buttonPressed: boolean;

  simTimeMs: number;
}
```

Las velocidades de motores deben normalizarse según los rangos reales de la librería.

Si la librería usa valores 0–100 y luego los transforma a PWM, conservar ese comportamiento conceptual.

---

# 10. Loop de simulación

Objetivo:

```txt
60 FPS visuales
```

La física debe ejecutarse con timestep fijo.

Ejemplo:

```txt
physicsStep = 10 ms
```

No atar la física directamente a `requestAnimationFrame`.

Arquitectura sugerida:

```txt
UI thread
   |
   | commands/events
   v
Web Worker
   |
   |- code runtime
   |- robot physics
   |- sensor model
   |- session rules
```

Render:

```txt
Worker state snapshot
        |
        v
Canvas renderer
```

---

# 11. Sensores de línea

Los 3 sensores deben consultar el color/ocupación del terreno directamente debajo de su posición.

Cada sensor tiene un offset respecto al centro del robot.

Ejemplo conceptual:

```ts
const LINE_SENSORS = {
  left:   { x: -offsetX, y: frontOffset },
  center: { x: 0,        y: frontOffset },
  right:  { x: offsetX,  y: frontOffset },
};
```

No usar únicamente detección booleana.

Exponer un valor analógico similar al robot real.

Ejemplo:

```txt
negro -> valor bajo
blanco -> valor alto
```

Los umbrales deben configurarse por sesión o robot.

---

# 12. Sensores IR

Soportar:

```ts
irLeft
irRight
```

En las librerías reales existe lógica de estabilización/filtro.

La simulación debe intentar imitar dicho comportamiento.

Si la librería usa múltiples lecturas y mayoría, replicar la lógica.

Los estímulos de IR deben poder generarse desde la escena.

Ejemplo S01:

```txt
IR izquierdo activo
IR derecho libre
```

El estudiante debe poder cambiar el estímulo para probar ambos casos.

UI sugerida:

```txt
[ IR IZQ. ACTIVO ] [ IR DER. LIBRE ]
```

---

# 13. Sonar

Debe calcular distancia desde el sensor frontal hasta:

- caja;
- obstáculo;
- pared;
- elemento válido de la pista.

Rango máximo esperado según la librería real.

Si la librería define 300 cm como máximo, respetarlo.

Cuando no existe objeto:

```txt
sonar = maxDistance
```

---

# 14. LCD

Simular LCD 16x2.

Estado:

```ts
interface LCDState {
  row1: string;
  row2: string;
}
```

Reglas:

- máximo 16 caracteres visibles por fila;
- texto que exceda el ancho debe truncarse;
- respetar funciones reales de la librería.

UI del simulador debe mostrar exactamente el contenido actual.

---

# 15. Pulsador

Debe existir un control interactivo visible en el inspector del robot.

Evento:

```ts
pressButton()
releaseButton()
```

Luego podrá utilizarse en sesiones futuras.

---

# 16. Código Arduino

## Principio clave

NO ejecutar C++ arbitrario en el navegador.

Para el MVP crear un **intérprete restringido Arduino/IROH**.

Debe soportar únicamente el subconjunto necesario para las 16 sesiones educativas.

---

# 17. Subconjunto de lenguaje

Soportar inicialmente:

## Tipos

```cpp
int
bool
float
long
```

## Variables

```cpp
int contador = 0;
bool izquierda = false;
```

## Operadores

```txt
+
-
*
/
%
==
!=
<
>
<=
>=
&&
||
!
++
--
```

## Control

```cpp
if
else
while
for
```

## Funciones propias

```cpp
void setup()
void loop()
```

Permitir funciones auxiliares simples:

```cpp
void seguirLinea() {
}
```

## Arduino básico

Evaluar si las sesiones utilizan:

```cpp
delay()
millis()
```

Implementarlos si aparecen en el material.

`delay` nunca debe bloquear el UI thread.

Debe convertirse en espera dentro de la máquina virtual.

---

# 18. Parser

No usar regex como parser principal.

Crear:

```txt
Tokenizer
   ↓
Parser
   ↓
AST
   ↓
Interpreter
```

Ejemplo:

```ts
type Statement =
  | VariableDeclaration
  | Assignment
  | IfStatement
  | WhileStatement
  | ForStatement
  | FunctionCall
  | ReturnStatement;
```

Ejecutar el AST dentro del Web Worker.

---

# 19. Protección contra código infinito

El estudiante puede escribir:

```cpp
while (true) {
}
```

El motor no debe congelarse.

Agregar:

```txt
instruction budget por tick
```

Ejemplo:

```txt
10.000 instrucciones/tick
```

Si se supera:

```txt
ExecutionLimitError
```

Mostrar:

> Tu programa está ejecutando demasiadas instrucciones sin darle tiempo al robot para reaccionar.

---

# 20. API IROH simulada

Crear una capa:

```txt
IrohRuntimeAdapter
```

Nunca conectar el intérprete directamente con el motor.

Ejemplo:

```ts
interface IrohRuntimeAdapter {
  move(...args: number[]): void;
  stop(): void;

  readLineLeft(): number;
  readLineCenter(): number;
  readLineRight(): number;

  readIRLeft(): boolean;
  readIRRight(): boolean;

  readSonar(): number;

  printLCD(...args: unknown[]): void;

  readButton(): boolean;
}
```

IMPORTANTE:

Los nombres públicos visibles para el estudiante deben ser exactamente los de las librerías reales.

La interfaz anterior es solamente interna.

---

# 21. Modelo de pista

No codificar cada pista directamente dentro de React.

Crear archivos JSON/TS declarativos.

Ejemplo:

```ts
interface TrackDefinition {
  id: string;

  physicalWidthCm: number;
  physicalHeightCm: number;

  paths: LinePath[];
  gaps: GapZone[];
  intersections: IntersectionZone[];

  startZones: Zone[];
  finishZones: Zone[];

  obstacles: Obstacle[];
  triggerZones: TriggerZone[];
}
```

---

# 22. Dimensiones conocidas de los plotters

Según los archivos proporcionados:

```txt
S01 -> 100 x 140
S02 -> 100 x 200
S03 -> 100 x 180
S04 -> 100 x 200
S05 -> 100 x 200
S06 -> 100 x 200
S08 -> 100 x 200
```

Interpretar inicialmente estas dimensiones como centímetros físicos:

```txt
100 cm = 1 metro
```

Confirmar durante calibración del simulador.

---

# 23. Representación de línea

No rasterizar la lógica.

La pista debe tener una representación geométrica.

Ejemplo:

```ts
interface LinePath {
  widthCm: number;
  points: Array<{
    x: number;
    y: number;
  }>;
}
```

Se puede renderizar en Canvas como trazo.

Los sensores deben consultar esta geometría.

---

# 24. Gaps

Un gap es una interrupción real de la línea.

No simularlo como evento artificial.

El path debe quedar físicamente interrumpido.

De esta forma los sensores dejarán de ver negro de manera natural.

---

# 25. Intersecciones

Definir intersecciones geométricamente.

Además, opcionalmente agregar metadata:

```ts
interface IntersectionZone {
  id: string;
  polygon: Point[];
}
```

Se usa para:
- depuración;
- feedback pedagógico;
- evaluación.

Pero el robot debe detectarlas usando sus sensores.

---

# 26. Obstáculos y cajas

Ejemplo:

```ts
interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;

  movable: boolean;
}
```

Soportar:

- detección IR;
- sonar;
- colisión;
- empuje;
- golpe mediante actuador si la librería lo requiere.

---

# 27. Robótica Intermedia

## Sesión 01

### Nombre

Seguir línea y mover obstáculo.

### Objetivo

El IROH debe desplazarse desde la base inicial hasta la base final siguiendo la línea por el lado indicado al inicio.

### Entrada inicial

Los sensores IR determinan el comportamiento.

Regla:

```txt
IR izquierdo
→ seguir línea por izquierda
→ mover obstáculo hacia derecha

IR derecho
→ seguir línea por derecha
→ mover obstáculo hacia izquierda
```

El robot debe mostrar la decisión en la LCD.

### Bonus

Al llegar al final, detenerse cuando ambos IR se activen simultáneamente.

### Elementos de escena

- base inicial roja;
- línea curva;
- obstáculo;
- base final roja;
- estímulo configurable IR izquierdo/derecho.

---

# 28. Sesión 02

### Nombre

Tres sensores y elección de base.

### Objetivo

Seguir línea de forma fluida usando los tres sensores.

Al llegar a la intersección elegir una base según los IR.

```txt
IR derecho -> Base 1
IR izquierdo -> Base 2
ambos IR -> Base 3
```

Debe detenerse en la base final.

Bonus:
- mostrar información de sensores en tiempo real.

---

# 29. Sesión 03

### Nombre

Contar obstáculos e intersecciones.

### Objetivos

- seguir línea con tres sensores;
- detectar obstáculos;
- contarlos;
- mostrar contador en LCD;
- detectar intersecciones;
- realizar giro de 180°.

Para evaluación se consideran:

```txt
3 obstáculos
3 intersecciones
```

Bonus:

Detenerse si detecta:
- dos obstáculos consecutivos sin intersección;
- o dos intersecciones consecutivas sin obstáculo.

---

# 30. Sesión 04

### Nombre

Gaps, intersecciones y `while`.

### Objetivos

- seguir línea con 3 sensores;
- cruzar primer gap;
- primera intersección:
  - detener 1 segundo;
- avanzar recto usando `while`;
- detectar segunda intersección;
- detener nuevamente;
- continuar;
- detenerse en tercera intersección.

Bonus:
- baile al llegar.

---

# 31. Sesión 05

### Nombre

Contador IR y elección de ruta.

### Objetivos

Mientras IR izquierdo NO esté activo:

```txt
contar activaciones del IR derecho
```

Considerar rebote.

Cuando se activa IR izquierdo:

- mostrar contador en LCD;
- seguir línea con 3 sensores;
- cruzar gap;
- llegar a intersección;
- esperar activación de IR izquierdo;
- elegir camino.

Reglas:

```txt
contador = 1 -> Base 1
contador = 2 -> Base 2
contador >= 3 -> Base 3
```

Debe detenerse al llegar.

Bonus:
- regresar a la base inicial.

---

# 32. Sesión 06

### Nombre

Sonar, cajas y velocidad.

### Objetivos

- seguir línea con 3 sensores;
- detectar caja lejana;
- bajar velocidad;
- detectar caja cercana;
- detenerse;
- golpear caja;
- al detectar intersección:
  - detener;
  - esperar IR;
  - girar 180° en el mismo sentido del IR activado;
  - continuar siguiendo línea.

Bonus:

Después de 20 segundos:
- aumentar velocidad;
- sin perder la línea.

---

# 33. Sesión 07

### Nombre

Sesión de repaso.

No existe un plotter obligatorio en el material entregado.

Crear modo práctica.

Permitir seleccionar:

- seguimiento de línea;
- intersecciones;
- gaps;
- IR;
- sonar;
- LCD.

No inventar un desafío oficial.

---

# 34. Sesión 08

### Nombre

Clasificatoria final.

### Objetivos

Seguir línea hasta una de cuatro bases.

Hay:

- dos gaps;
- posibles cajas a izquierda/derecha;
- conteo de cajas;
- intersección;
- selección de línea A/B;
- bifurcaciones;
- cuatro bases finales.

El número de cajas determina la base.

En la primera intersección:

```txt
IR izquierdo -> línea A
IR derecho -> línea B
```

En bifurcaciones:
- detenerse 1 segundo.

Al final:
- detenerse en base correcta.

Mostrar resultado en LCD.

Bonus:
- medir duración total del desafío;
- mostrar tiempo en LCD.

---

# 35. Scene config por sesión

Crear:

```txt
src/content/intermedio/
  s01.ts
  s02.ts
  s03.ts
  s04.ts
  s05.ts
  s06.ts
  s07.ts
  s08.ts
```

Ejemplo:

```ts
export const session01: SessionDefinition = {
  id: "intermedio-s01",

  title: "Seguir línea y mover obstáculo",

  concepts: [
    "IR",
    "seguidor de línea",
    "LCD",
    "condicionales",
  ],

  track: trackS01,

  objectives: [
    "...",
  ],

  initialEnvironment: {
    irStimulus: "left",
  },
};
```

---

# 36. Sistema de eventos

El motor debe emitir eventos.

Ejemplos:

```ts
type SimulationEvent =
  | { type: "LINE_LOST" }
  | { type: "LINE_RECOVERED" }
  | { type: "IR_CHANGED"; side: "left" | "right"; value: boolean }
  | { type: "OBSTACLE_DETECTED"; distance: number }
  | { type: "INTERSECTION_ENTERED"; id: string }
  | { type: "GAP_ENTERED"; id: string }
  | { type: "FINISH_REACHED"; id: string }
  | { type: "LCD_UPDATED"; rows: [string, string] }
  | { type: "COLLISION"; objectId: string };
```

Esto alimenta:
- UI;
- feedback;
- debugging;
- futura evaluación.

---

# 37. “¿Qué está pasando?”

No implementar como chatbot.

Crear un `LearningFeedbackEngine`.

Ejemplo:

```ts
if (session === "s01" && irLeft && robot.followSide === "left") {
  message = "El IR izquierdo quedó activo al inicio y el IROH está siguiendo la línea por la izquierda.";
}
```

Feedback debe ser:

- breve;
- explicativo;
- relacionado con lo que el alumno programó;
- sin revelar automáticamente la solución completa.

---

# 38. Guía y conceptos

Abrir en drawer lateral o modal grande.

No navegar fuera del simulador.

Contenido organizado por sesión.

Ejemplo S01:

```txt
Sensor IR
Seguidor de línea
if / else
Variables booleanas
LCD
Sonar
```

Cada concepto:

```txt
Qué es
Para qué sirve
Ejemplo corto
Error frecuente
```

No mostrar respuestas completas al desafío.

---

# 39. Editor

Monaco debe configurarse como:

```txt
language: cpp
```

Features:

- syntax highlighting;
- line numbers;
- bracket matching;
- auto-indent;
- error markers;
- autocomplete IROH;
- hover documentation.

Autocompletado solo debe mostrar las funciones que corresponden al nivel/sesiones aprendidas hasta ese momento.

Ejemplo:

S01 no debe mostrar automáticamente todo el catálogo avanzado si todavía no fue visto.

---

# 40. Diagnóstico de errores

Separar:

## Syntax error

Ejemplo:

```txt
Falta cerrar un paréntesis en la línea 12.
```

## Runtime error

Ejemplo:

```txt
Tu programa quedó atrapado en un ciclo que no permite avanzar la simulación.
```

## Robot behavior warning

Ejemplo:

```txt
El IROH lleva 3 segundos fuera de la línea.
```

No usar errores crípticos de compilador como interfaz principal.

Permitir abrir detalles técnicos opcionalmente.

---

# 41. Persistencia

MVP:

```txt
localStorage
```

Guardar:

```ts
interface SavedSessionState {
  code: string;
  lastOpenedAt: number;
  completed?: boolean;
}
```

Separar por:

```txt
nivel
sesión
```

---

# 42. Estado global

Evitar una megastore.

Separar:

```txt
session state
editor state
simulation state
UI state
```

Usar Zustand solo si aporta valor.

Para MVP puede bastar React Context + reducers.

---

# 43. Estructura recomendada

```txt
src/
  app/
    routes/

  components/
    Button/
    Card/
    Drawer/
    Modal/
    StatusBadge/

  features/
    session-explorer/
    code-editor/
    simulator/
    guide/
    telemetry/

  simulator/
    engine/
      SimulationEngine.ts
      RobotPhysics.ts

    runtime/
      tokenizer/
      parser/
      interpreter/
      IrohRuntimeAdapter.ts

    sensors/
      LineSensor.ts
      IRSensor.ts
      SonarSensor.ts

    scene/
      Track.ts
      Obstacles.ts
      Collision.ts

    renderer/
      CanvasRenderer.ts

    worker/
      simulator.worker.ts

  content/
    intermedio/
      s01.ts
      ...
      s08.ts

    concepts/

  assets/

  styles/

  tests/
```

---

# 44. Responsive

Prioridad:

```txt
desktop / notebook
```

Referencia principal:

```txt
1600 x 1000
```

Debe funcionar correctamente desde:

```txt
1280 px
```

Si el ancho baja:

```txt
< 1200
```

permitir:

```txt
Editor | Simulador
```

mediante tabs.

No intentar meter ambos paneles comprimidos.

---

# 45. Accesibilidad

Obligatorio:

- navegación por teclado;
- foco visible;
- contraste AA;
- labels;
- botones >= 40 px;
- no depender solamente del color;
- `aria-live` para cambios importantes de simulación;
- editor no debe atrapar permanentemente el teclado;
- prefers-reduced-motion.

---

# 46. Rendimiento

Objetivo:

```txt
60 FPS
```

No renderizar React a 60 Hz.

React solo debe actualizar información humana útil.

Ejemplo:

```txt
sensor UI = 10 Hz
canvas = 60 Hz
physics = timestep fijo
```

---

# 47. Seguridad

El código ingresado por el alumno es entrada no confiable.

Nunca:

```js
eval(userCode)
new Function(userCode)
```

El intérprete debe ser aislado.

Agregar límites:

- instrucciones;
- memoria;
- tiempo;
- tamaño del código;
- profundidad de recursión;
- cantidad de variables.

No permitir:

- imports arbitrarios;
- acceso DOM;
- fetch;
- filesystem;
- Web APIs.

---

# 48. Pruebas unitarias

Crear pruebas para:

- diferencial de motores;
- rotación;
- sensor de línea;
- sonar;
- IR;
- gaps;
- intersecciones;
- LCD;
- parser;
- if/else;
- while;
- for;
- instruction budget;
- adapter IROH.

---

# 49. Pruebas de sesiones

Cada sesión debe tener al menos un programa de referencia interno de test.

NO mostrarlo al alumno.

Ejemplo:

```txt
tests/reference-programs/intermedio-s01.cpp
```

Tests:

```txt
Given code válido
When simulator runs
Then expected finish zone reached
```

También programas incorrectos.

---

# 50. Pruebas E2E

Playwright.

Flujo mínimo:

```txt
abrir explorador
→ elegir S01
→ escribir código
→ ejecutar
→ robot comienza movimiento
→ pausar
→ reiniciar
→ código sigue guardado
```

---

# 51. Visual regression

Tomar snapshots de:

- Explorador.
- S01.
- drawer de guía.
- estado error.
- estado ejecución.
- estado pausa.

Comparar contra Figma.

---

# 52. Criterio de aceptación S01

S01 se considera terminado cuando:

1. La pista coincide funcionalmente con el plotter.
2. El alumno puede elegir estímulo inicial:
   - IR izquierdo;
   - IR derecho.
3. El código puede leer el estímulo.
4. La LCD refleja datos escritos por el programa.
5. El robot puede seguir línea.
6. Los sensores de línea reaccionan a la geometría real.
7. El robot puede detectar el obstáculo.
8. El comportamiento cambia según IR.
9. Puede llegar a la base final.
10. Reiniciar devuelve toda la escena al estado inicial.
11. Cambiar código y volver a ejecutar no requiere recargar.
12. Un loop infinito no congela el navegador.

---

# 53. Orden de implementación

## Fase 1 — Base

- React/TS.
- routing.
- tokens.
- layout.
- Explorador S01–S08.

## Fase 2 — Canvas

- renderer.
- world coordinates.
- pistas.
- robot visual.

## Fase 3 — Física

- differential drive.
- collision.
- obstacles.

## Fase 4 — Sensores

- 3 línea.
- IR.
- sonar.
- LCD.

## Fase 5 — Runtime

- tokenizer.
- parser.
- AST.
- interpreter.
- instruction budget.

## Fase 6 — Vertical slice S01

Completar completamente S01.

NO avanzar a otras sesiones hasta que S01 sea sólida.

## Fase 7 — S02–S06

Agregar capacidades incrementales.

## Fase 8 — S07

Modo repaso.

## Fase 9 — S08

Clasificatoria.

## Fase 10 — QA

- accesibilidad;
- performance;
- E2E;
- visual regression.

---

# 54. Regla importante para Codex

Antes de programar cualquier función pública del robot:

1. inspeccionar las librerías reales del IROH;
2. crear una tabla de API;
3. confirmar:
   - nombre;
   - argumentos;
   - retorno;
   - rangos;
   - efectos;
4. recién entonces implementar el adapter.

Crear:

```txt
docs/iroh-api.md
```

con la API encontrada.

No asumir que los nombres usados en Figma son exactos.

---

# 55. Conversión de plotters

Crear una herramienta interna:

```txt
tools/track-importer/
```

Objetivo:

convertir los plotters entregados a:

```json
{
  "physicalWidthCm": 100,
  "physicalHeightCm": 200,
  "paths": [],
  "zones": [],
  "obstacles": []
}
```

La geometría debe poder corregirse manualmente.

No depender del archivo PDF/SVG en runtime.

El runtime usa JSON limpio.

---

# 56. Debug mode

Crear modo desarrollador no visible para alumnos.

Activación:

```txt
?debug=1
```

Mostrar:

- bounding boxes;
- sensor rays;
- sensor values;
- track geometry;
- collision shapes;
- robot center;
- heading;
- FPS;
- physics tick;
- runtime instructions.

Muy importante para calibrar pistas.

---

# 57. Inspector pedagógico

En producción mostrar solo datos entendibles.

Ejemplo:

```txt
Línea izquierda   802
Línea centro      238
Línea derecha     791

IR izquierdo      ACTIVO
IR derecho        LIBRE

Sonar             46 cm
```

Opcionalmente:

```txt
Modo avanzado
```

para estudiantes intermedios.

---

# 58. Estados de simulación

```ts
type SimulationStatus =
  | "idle"
  | "compiling"
  | "running"
  | "paused"
  | "finished"
  | "error";
```

UI debe reflejar claramente cada estado.

---

# 59. Botón ejecutar

Flujo:

```txt
Click Ejecutar
     ↓
parse code
     ↓
validate API
     ↓
reset scene
     ↓
setup()
     ↓
start simulation loop
     ↓
loop()
```

Si existe error:

- no iniciar robot;
- marcar línea;
- mensaje simple.

---

# 60. Reinicio

Debe resetear:

- robot;
- motores;
- sensores;
- obstáculos;
- cajas;
- tiempo;
- LCD;
- variables runtime;
- eventos.

NO borrar el código.

---

# 61. Cambio de sesión

Al cambiar sesión:

- guardar código actual;
- detener simulación;
- cargar nueva pista;
- cargar plantilla inicial de esa sesión;
- actualizar conceptos;
- actualizar funciones sugeridas.

---

# 62. Plantilla de código

Cada sesión puede incluir starter code.

Ejemplo:

```ts
starterCode: `
// Sesión 01

void setup() {

}

void loop() {

}
`
```

No incluir solución.

---

# 63. Funciones sugeridas

La UI puede mostrar chips.

Ejemplo:

```txt
leer IR
avanzar
girar
escribir LCD
leer línea
```

Al click:

mostrar:

```txt
nombre real
qué hace
parámetros
ejemplo mínimo
```

No insertar automáticamente una solución completa.

---

# 64. Branding

No fabricar logos de Fundación Mustakis.

Si se usan logos o assets institucionales:

- cargar archivos oficiales proporcionados;
- conservar proporciones;
- no modificar el logo.

IROH Lab puede mantener identidad propia del simulador.

---

# 65. Calidad esperada

El proyecto debe quedar:

- tipado;
- modular;
- testeable;
- documentado;
- sin archivos gigantes;
- sin lógica del motor dentro de componentes React;
- sin valores mágicos dispersos;
- sin código muerto;
- sin placeholders genéricos visibles.

---

# 66. README

Actualizar README con:

```txt
qué es IROH Lab
requisitos
instalación
desarrollo
tests
arquitectura
cómo agregar una sesión
cómo agregar una pista
cómo agregar una función IROH
debug mode
```

---

# 67. Primer objetivo de Codex

NO intentar construir todo de una sola vez.

Primera entrega:

## Milestone 1

1. inspeccionar repo;
2. inspeccionar librerías IROH;
3. documentar API;
4. crear aplicación base;
5. implementar Explorador S01–S08;
6. crear Canvas;
7. cargar geometría S01;
8. dibujar IROH;
9. permitir mover robot con comandos internos;
10. entregar tests.

## Milestone 2

1. sensores de línea;
2. IR;
3. sonar;
4. LCD;
5. física S01.

## Milestone 3

1. parser;
2. interpreter;
3. adapter;
4. ejecutar código de alumno;
5. completar vertical slice S01.

Solamente después continuar con S02.

---

# 68. Definición final de éxito

El producto está cumpliendo su objetivo cuando un estudiante puede:

> abrir una sesión que vio en clase, recordar el desafío, escribir su código Arduino usando las funciones del IROH, ejecutar el programa, observar al robot virtual sobre la pista real, ver qué están leyendo sus sensores, entender por qué se comporta de cierta manera, corregir su código y volver a probar sin necesitar el robot físico.

Ese es el objetivo central.

No perderlo durante la implementación.

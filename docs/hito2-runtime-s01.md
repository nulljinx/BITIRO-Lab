# IROH Lab — Segundo encargo para Codex
## Completar S01: runtime Arduino restringido + integración real código → robot

> **Repositorio base:** continuar sobre el proyecto actual `iroh-lab`.  
> **NO rehacer la aplicación. NO reemplazar la arquitectura existente. NO avanzar a S02–S08.**  
> Este hito tiene un único objetivo: transformar la Sesión 01 actual desde una maqueta interactiva con controles manuales a una **vertical funcional completa en la que el código escrito por el estudiante controle realmente al IROH virtual**.

---

# 1. Estado actual verificado

El repositorio ya contiene una base válida y debe conservarse.

## Stack actual

- React 19
- TypeScript
- Vite
- React Router
- Monaco Editor
- Canvas 2D
- Web Worker
- Vitest
- Playwright
- IBM Plex Sans
- IBM Plex Mono

No cambiar el stack salvo necesidad técnica justificada.

## Archivos existentes relevantes

```txt
src/
  app/
    App.tsx

  content/
    api.ts
    sessions.ts
    tracks/
      s01.json

  features/
    code-editor/
      CodeEditor.tsx
      storage.ts

    guide/
      Guide.tsx

    session-explorer/
      Explorer.tsx

    simulator/
      Arena.tsx
      Simulator.tsx
      useSimulation.ts

  simulator/
    config.ts
    geometry.ts
    RobotPhysics.ts
    sensors.ts
    SimulationEngine.ts
    types.ts

    renderer/
      CanvasRenderer.ts

    worker/
      simulator.worker.ts

  tests/
    engine.test.ts
```

## Documentación existente

```txt
docs/
  iroh-api.md
  fuentes-y-decisiones.md
  especificacion.md
```

La auditoría de `docs/iroh-api.md` es la fuente de verdad para la API pública del robot.

---

# 2. Lo que NO funciona todavía

Actualmente el estudiante puede escribir código en Monaco, pero ese código:

- no se tokeniza;
- no se parsea;
- no se interpreta;
- no llama al robot virtual;
- no controla motores;
- no lee sensores;
- no escribe en LCD;
- no controla el servo de golpe.

El robot solo puede moverse mediante controles manuales internos de la interfaz.

Esto significa que S01 todavía no es un simulador educativo completo.

---

# 3. Objetivo exacto del hito

Al terminar este trabajo, el siguiente flujo debe funcionar:

```txt
Alumno abre S01
    ↓
escribe código Arduino/IROH
    ↓
pulsa "Ejecutar en simulador"
    ↓
se tokeniza y parsea
    ↓
si existe error:
    editor muestra error
    robot NO comienza
    ↓
si es válido:
    reset completo de la escena
    ↓
ejecutar setup()
    ↓
ejecutar loop() cooperativamente
    ↓
las funciones IROH modifican el robot real del SimulationEngine
    ↓
sensores retornan valores de la escena
    ↓
LCD refleja escribirPantalla()
    ↓
servo de golpe interactúa con la caja
    ↓
estudiante observa, pausa, reinicia, corrige y vuelve a ejecutar
```

---

# 4. Restricción principal de seguridad

## Prohibido

No usar:

```js
eval(...)
new Function(...)
```

No ejecutar JavaScript generado desde el código del estudiante.

No compilar C++ arbitrario en el navegador.

No dar acceso al código del estudiante a:

- DOM;
- `window`;
- `document`;
- `fetch`;
- cookies;
- localStorage;
- filesystem;
- Web APIs;
- Workers;
- imports arbitrarios.

El programa del estudiante debe ejecutarse exclusivamente en una máquina virtual/intérprete propio y restringido.

---

# 5. Arquitectura a incorporar

Crear esta capa sin romper la existente:

```txt
Monaco Editor
    │
    ▼
Tokenizer
    │
    ▼
Parser
    │
    ▼
AST
    │
    ▼
Interpreter / Runtime
    │
    ▼
IrohRuntimeAdapter
    │
    ▼
SimulationEngine
    │
    ├── RobotPhysics
    ├── Sensors
    ├── LCD
    ├── Servo golpe
    └── Obstacle physics
```

Todo el runtime del código del alumno debe ejecutarse dentro del **Web Worker existente**, no en el hilo principal.

---

# 6. Nueva estructura recomendada

Añadir:

```txt
src/simulator/runtime/
  tokenizer/
    tokens.ts
    Tokenizer.ts

  parser/
    ast.ts
    Parser.ts

  interpreter/
    Environment.ts
    Interpreter.ts
    RuntimeError.ts

  IrohRuntimeAdapter.ts
  ProgramRuntime.ts
  runtime-types.ts
```

Tests:

```txt
src/tests/runtime/
  tokenizer.test.ts
  parser.test.ts
  interpreter.test.ts
  iroh-adapter.test.ts
  execution-budget.test.ts
  s01-reference.test.ts
```

No meter parser/intérprete dentro de:

```txt
SimulationEngine.ts
Simulator.tsx
CodeEditor.tsx
```

---

# 7. Subconjunto Arduino/C++ del MVP

Implementar solo lo necesario para las sesiones educativas.

No intentar soportar C++ completo.

## 7.1 Preprocesador

Aceptar y omitir de forma segura:

```cpp
#include <KnightRoboticsLibs_Iroh.h>
```

Para el MVP puede tratarse como directiva reconocida y no como import real.

Cualquier include distinto debe producir error pedagógico:

```txt
Esta versión del simulador solo permite la librería del IROH.
```

---

# 8. Tipos soportados

Inicialmente:

```cpp
int
bool
long
float
```

También permitir:

```cpp
const char[]
```

únicamente en el contexto necesario para:

```cpp
escribirPantalla(...)
```

Si implementar strings generales complica innecesariamente el runtime, aceptar literales de texto como tipo interno `string` sin intentar reproducir toda la semántica C++.

---

# 9. Literales

Soportar:

```cpp
10
-10
3.5
true
false
"IR IZQUIERDO"
```

---

# 10. Variables

Soportar:

```cpp
int contador = 0;
bool ladoIzquierdo = false;
int sensor = leerSensorLineaCentral();
```

También:

```cpp
contador = contador + 1;
contador++;
contador--;
```

Scopes:

- global;
- función;
- bloque `{}`.

---

# 11. Operadores

## Aritméticos

```txt
+
-
*
/
%
```

## Comparación

```txt
==
!=
<
>
<=
>=
```

## Lógicos

```txt
&&
||
!
```

## Asignación

```txt
=
+=
-=
```

`++` y `--`.

No implementar operadores no necesarios todavía.

---

# 12. Control de flujo

Soportar:

```cpp
if
else
else if
while
for
```

También:

```cpp
break;
```

si las sesiones reales lo requieren.

`continue` puede quedar fuera si no aparece en el material.

---

# 13. Funciones

Obligatorio:

```cpp
void setup()
void loop()
```

Permitir funciones auxiliares simples:

```cpp
void seguirLinea() {
  ...
}
```

Parámetros básicos:

```cpp
void mover(int velocidad) {
}
```

No implementar aún:

- clases;
- structs;
- templates;
- punteros;
- referencias C++;
- macros;
- lambdas;
- namespaces;
- heap manual.

---

# 14. Funciones Arduino necesarias

Implementar como primitivas del runtime si aparecen en las sesiones:

```cpp
millis()
```

`delay()` puede aceptarse como alias de `pausa()` únicamente si el material real lo utiliza.

Priorizar la función real IROH:

```cpp
pausa(int tiempo)
```

---

# 15. API pública IROH que debe conectar el runtime

Usar **exactamente** los nombres documentados en `docs/iroh-api.md`.

## Movimiento

```cpp
avanzar(int vel);
avanzar(int velIzq, int velDer);

retroceder(int vel);
retroceder(int velIzq, int velDer);

detenerse();

girarDerecha(int vel);
girarIzquierda(int vel);
```

## Inicialización

```cpp
inicializarMovimiento();
inicializarSensores();
inicializarPantalla();
inicializarGolpe();
```

También reconocer los alias `...Robot` documentados si el material de los estudiantes los utiliza.

## Sensores

```cpp
leerSensorLineaIzquierdo();
leerSensorLineaCentral();
leerSensorLineaDerecho();

leerSensorObstaculoIzquierdo();
leerSensorObstaculoDerecho();

leerDistanciaSonar();

leerBoton();
botonInicio();
```

## LCD

```cpp
escribirPantalla(int col, int fil, const char Text[]);
escribirPantalla(int col, int fil, int Number);

borrarPantalla();
apagarPantalla();
prenderPantalla();
```

## Servo

```cpp
moverServoGolpe(int pos);
```

donde:

```txt
-1 -> 165°
 0 -> 90°
 1 -> 15°
```

## Tiempo y fin

```cpp
pausa(int tiempo);
finPrograma();
```

---

# 16. No corregir silenciosamente la librería real

La simulación educativa debe respetar las peculiaridades documentadas.

## avanzar(0)

La librería real no equivale `avanzar(0)` a detenerse.

No convertirlo automáticamente en freno.

## detenerse()

Debe preservar conceptualmente los **70 ms** de freno/cambio de modo documentados.

## Sonar

La librería real:

```txt
sin eco -> 0
<= 5 cm -> 0
máximo -> 300 cm
```

No devolver 300 cuando no hay eco.

## IR

API correcta:

```cpp
leerSensorObstaculoIzquierdo()
leerSensorObstaculoDerecho()
```

No inventar:

```cpp
leerSensorIRIzquierdo()
leerSensorIRDerecho()
```

## línea

La lectura analógica real es:

```txt
0–1023
```

La librería no convierte por sí sola a blanco/negro.

---

# 17. Semántica cooperativa del intérprete

Este punto es obligatorio.

Funciones como:

```cpp
pausa(1000);
detenerse();
botonInicio();
```

NO pueden bloquear el Worker con sleeps reales.

El runtime debe suspender el programa y continuar según **tiempo simulado**.

Ejemplo:

```ts
type RuntimeWait =
  | { type: "time"; untilSimMs: number }
  | { type: "button" }
  | { type: "motor-brake"; untilSimMs: number };
```

Durante la espera:

- la física continúa cuando corresponda;
- el navegador sigue respondiendo;
- Canvas sigue dibujando;
- el estudiante puede pausar o reiniciar.

---

# 18. setup() y loop()

Comportamiento requerido:

## Inicio

```txt
reset scene
reset runtime environment
compile/parse
setup()
```

`setup()` se ejecuta una sola vez.

Después:

```txt
loop()
loop()
loop()
...
```

No ejecutar `loop()` completo millones de veces en el mismo tick.

Debe reanudarse cooperativamente.

---

# 19. Instruction budget

Evitar congelamiento por código como:

```cpp
while (true) {
  contador++;
}
```

Agregar límites.

Ejemplo inicial:

```txt
5.000–10.000 instrucciones por slice
```

Si el programa no cede control:

```txt
RuntimeBudgetExceeded
```

Mensaje para alumno:

> Tu programa está ejecutando demasiadas instrucciones seguidas sin darle tiempo al IROH para reaccionar.

No mostrar stack traces crudos como mensaje principal.

---

# 20. Límite de ejecución

Agregar defensas:

```txt
máx. tamaño código
máx. variables
máx. profundidad llamadas
máx. profundidad AST
máx. longitud strings
máx. instrucciones por slice
```

Los límites exactos pueden definirse en:

```txt
src/simulator/runtime/runtime-limits.ts
```

---

# 21. Errores

Crear clases distinguibles.

## SyntaxError educativo

Ejemplo:

```txt
Línea 14: falta ')' después de la condición.
```

## UnknownFunctionError

```txt
Línea 18: "leerSensorIRIzquierdo" no existe en la librería IROH.
¿Quisiste usar "leerSensorObstaculoIzquierdo"?
```

Puede ofrecer sugerencia por distancia de edición, pero no modificar el código automáticamente.

## ArgumentError

```txt
moverServoGolpe() espera -1, 0 o 1.
```

## ExecutionLimitError

Loop no cooperativo.

## RuntimeError

División por cero, variable no definida, etc.

---

# 22. Integración con Monaco

Actualmente `CodeEditor.tsx` solo guarda y descarga.

Modificarlo sin perder:

- Monaco;
- tema actual;
- persistencia;
- autocompletado;
- hover;
- descarga `.ino`.

Agregar botones:

```txt
Revisar código
Ejecutar en simulador
```

Estados:

```txt
Listo
Revisando
Ejecutando
Error
```

---

# 23. Marcadores de error Monaco

Cuando parser/runtime reporten:

```ts
{
  line: 12,
  column: 5,
  message: "..."
}
```

usar Monaco markers.

Ejemplo conceptual:

```ts
monaco.editor.setModelMarkers(...)
```

El alumno debe ver el error directamente en la línea correspondiente.

Limpiar markers después de una compilación válida.

---

# 24. Comunicación Editor → Worker

No mandar el código al motor mediante comandos manuales de motores.

Agregar un protocolo explícito.

Ejemplo:

```ts
type WorkerCommand =
  | { type: "load-program"; source: string }
  | { type: "run-program"; source: string }
  | { type: "stop-program" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "reset" }
  | { type: "speed"; value: number }
  | { type: "ir"; side: "left" | "right"; value: boolean }
  | { type: "button"; value: boolean };
```

Respuesta:

```ts
type WorkerResponse =
  | { type: "snapshot"; snapshot: Snapshot }
  | { type: "compile-ok" }
  | { type: "compile-error"; diagnostics: Diagnostic[] }
  | { type: "runtime-error"; diagnostic: Diagnostic }
  | { type: "program-finished" };
```

No mezclar diagnostics dentro de strings genéricos de feedback.

---

# 25. Estado de simulación

Actualizar:

```ts
export type Status =
  | "idle"
  | "compiling"
  | "running"
  | "paused"
  | "finished"
  | "error";
```

La UI debe manejar todos esos estados.

---

# 26. IrohRuntimeAdapter

Crear una única capa responsable de convertir llamadas del programa en acciones del motor.

Ejemplo interno:

```ts
class IrohRuntimeAdapter {
  constructor(
    private engine: SimulationEngine,
    private runtime: ProgramRuntime
  ) {}

  call(name: string, args: RuntimeValue[]): RuntimeValue | RuntimeWait {
    ...
  }
}
```

Nunca hacer:

```ts
engine[name](...)
```

ni lookup dinámico inseguro.

Usar un mapping explícito:

```ts
switch (name) {
  case "avanzar":
  case "retroceder":
  ...
}
```

---

# 27. Conversión velocidad IROH → física

El usuario programa valores educativos:

```txt
0–100
```

La física actual usa:

```txt
cm/s
```

Crear función explícita:

```ts
irohSpeedToCmS(value: number): number
```

No dispersar conversiones.

Mantener la calibración física provisional documentada.

Ejemplo conceptual:

```txt
100 -> ROBOT.maxWheelCmS
```

pero respetar peculiaridad de PWM base de la librería cuando sea relevante.

Documentar claramente qué parte es:

- fidelidad lógica;
- calibración física provisional.

---

# 28. Movimiento y cambio de modo

La librería real introduce frenado de 70 ms al cambiar modo.

Crear estado interno:

```ts
type MovementMode =
  | "stopped"
  | "forward"
  | "backward"
  | "turn-left"
  | "turn-right";
```

Si una orden requiere cambio de modo:

```txt
freno
70 ms simulados
nueva orden
```

Tests obligatorios.

---

# 29. IR real del runtime

Actualmente `SimulationEngine` almacena:

```ts
irLeft
irRight
```

y la UI puede cambiarlos.

El programa debe leerlos usando:

```cpp
leerSensorObstaculoIzquierdo()
leerSensorObstaculoDerecho()
```

Replicar filtro de mayoría de 3 lecturas.

No hace falta simular microsegundos de manera gráfica.

Sí conservar semántica:

```txt
3 muestras
mayoría
separación conceptual de 200 µs
```

Si se modela el tiempo, incorporarlo al tiempo simulado; si no, documentar la aproximación.

---

# 30. LCD 16×2 funcional

Actualmente `RobotState` ya contiene:

```ts
lcd: [string, string]
```

Implementar estado real.

Requerimientos:

```cpp
escribirPantalla(col, fila, texto);
escribirPantalla(col, fila, numero);
```

Reglas:

- ventana visible 16×2;
- no borrar contenido previo automáticamente;
- posiciones fuera de rango deben manejarse de manera segura;
- `borrarPantalla()` limpia ambas filas;
- `apagarPantalla()` oculta/backlight off;
- `prenderPantalla()` vuelve a mostrar.

Agregar:

```ts
lcdBacklight: boolean
```

si hace falta en `RobotState`.

La UI debe representar backlight.

---

# 31. inicializarPantalla()

Según la librería real, inicialmente escribe:

```txt
KnightRobotics
```

desde columna 1, fila 0.

Replicar esto si no entra en conflicto con la experiencia pedagógica.

Si se decide simplificarlo, documentar la discrepancia; no hacerlo en silencio.

---

# 32. finPrograma()

No tratarlo como infinite loop/error.

Semántica requerida:

```txt
detener robot
borrar LCD
apagar LCD
estado finished
detener ejecución loop()
```

`finPrograma()` debe producir:

```txt
status = "finished"
```

---

# 33. botonInicio()

No bloquear.

Semántica:

```txt
si botón no está presionado:
    runtime suspendido en espera de botón

cuando se presiona:
    reanudar
```

El botón ya existe en la UI actual.

---

# 34. pausa()

Ejemplo:

```cpp
pausa(1000);
```

Debe:

- detener la ejecución del código por 1000 ms simulados;
- NO detener automáticamente los motores;
- permitir que el robot continúe desplazándose durante la pausa si los motores ya estaban activos.

Esto es muy importante.

Test obligatorio.

---

# 35. Sonar

Conectar:

```cpp
leerDistanciaSonar()
```

al valor real generado por `updateSensors()`.

Mantener:

```txt
0 sin eco
0 <=5 cm
máximo 300 cm
```

---

# 36. Servo de golpe

S01 necesita `moverServoGolpe()`.

Agregar al estado:

```ts
strikeServoPosition: -1 | 0 | 1
strikeServoAngle: number
```

o representación equivalente.

La llamada:

```cpp
moverServoGolpe(-1);
moverServoGolpe(0);
moverServoGolpe(1);
```

debe actualizar el actuador.

Valores distintos deben ignorarse o producir diagnóstico pedagógico; decidir de acuerdo con objetivo educativo y documentarlo.

---

# 37. Representación visual del servo

Actualizar `CanvasRenderer` para mostrar de forma simple el brazo/actuador de golpe del IROH.

No hace falta una simulación mecánica compleja.

Sí debe ser visible:

```txt
izquierda
centro
derecha
```

---

# 38. Caja de S01

Actualmente la caja es una colisión rígida y el robot se detiene al tocarla.

Eso ya NO es suficiente.

La caja S01 debe ser:

```ts
movable: true
```

y tener estado dinámico.

Separar:

```ts
StaticObstacle
DynamicObstacle
```

o ampliar el tipo actual.

Ejemplo:

```ts
interface DynamicObstacle extends Obstacle {
  vx: number;
  vy: number;
}
```

No es necesario implementar física general completa.

Solo la necesaria para el desafío.

---

# 39. Mover caja mediante servo

Cuando el servo de golpe intersecte la caja:

```txt
servo izquierda -> impulso hacia izquierda
servo derecha   -> impulso hacia derecha
```

Debe verse una traslación de la caja.

No teleportar instantáneamente de un lado al otro.

Aplicar un desplazamiento/impulso corto y determinista.

Debe ser reproducible en tests.

---

# 40. Colisión robot-caja

Antes del golpe:

- el robot no debe atravesarla.

Después de moverla:

- el camino puede quedar despejado.

La caja no debe desaparecer.

---

# 41. Final de S01

Detectar la base final mediante geometría, no una condición artificial basada en tiempo.

Agregar helper:

```ts
isInsideFinishZone(robot, track)
```

Cuando corresponda, emitir evento:

```ts
FINISH_REACHED
```

Pero NO terminar automáticamente el programa si el desafío requiere que el alumno llame a:

```cpp
detenerse()
```

o responda a los IR.

La evaluación debe distinguir:

```txt
llegó a la base
se detuvo correctamente
```

---

# 42. Bonus S01

El material indica que al final debe poder detenerse cuando ambos IR se activen.

Permitir que el usuario active:

```txt
IR izquierdo + IR derecho
```

al llegar al final.

No ejecutar esta acción automáticamente.

---

# 43. Eventos del motor

Agregar eventos tipados.

```ts
type SimulationEvent =
  | { type: "PROGRAM_STARTED" }
  | { type: "PROGRAM_PAUSED" }
  | { type: "PROGRAM_FINISHED" }
  | { type: "LINE_LOST" }
  | { type: "LINE_FOUND" }
  | { type: "OBSTACLE_DETECTED"; distance: number }
  | { type: "OBSTACLE_HIT"; obstacleId: string }
  | { type: "OBSTACLE_MOVED"; obstacleId: string }
  | { type: "FINISH_REACHED"; zoneId: string }
  | { type: "LCD_UPDATED"; rows: [string, string] }
  | { type: "RUNTIME_ERROR"; message: string };
```

No es obligatorio mostrar todos al alumno.

Servirán para:

- tests;
- feedback;
- evaluación futura.

---

# 44. Feedback pedagógico

La sección actual:

```txt
¿Qué está pasando?
```

debe dejar de depender solo de comandos manuales.

Crear reglas desde:

```txt
runtime + sensores + eventos
```

Ejemplos:

### Caso IR

> El programa leyó el IR izquierdo como activo. Esa información puede guardarse en una variable para decidir por qué lado seguir.

### Línea perdida

> Los tres sensores están leyendo superficie blanca. El IROH perdió la línea.

### Sonar

> El sonar está detectando un objeto a 18 cm.

### Caja

> El servo movió la caja hacia la derecha y despejó el recorrido.

No entregar automáticamente la solución completa.

---

# 45. Controles manuales

Actualmente existe:

```txt
PRUEBA MANUAL · HITO 1
```

Cuando el runtime esté funcionando:

- ocultarla en modo alumno normal;
- conservarla en:

```txt
?debug=1
```

o un modo de diagnóstico.

No eliminarla del código porque sigue siendo útil para calibración.

---

# 46. Botón Ejecutar

Cambiar el bloque actual que dice:

```txt
Ejecución Arduino
Disponible en el hito 3
```

por:

```txt
Revisar código
Ejecutar en simulador
```

Flujo:

```txt
Revisar código
→ tokenizer/parser
→ mostrar diagnostics
```

```txt
Ejecutar
→ parse
→ reset
→ run setup
→ start loop
```

---

# 47. Reiniciar

El botón Reiniciar debe resetear:

- runtime;
- variables;
- call stack;
- AST execution cursor;
- robot;
- motores;
- LCD;
- backlight;
- servo;
- caja;
- sensores;
- tiempo;
- eventos;
- status.

NO borrar el código del estudiante.

---

# 48. Pausar

Debe pausar conjuntamente:

- runtime;
- física;
- tiempo simulado.

Al reanudar:

- continuar desde el punto exacto.

No volver a ejecutar setup().

---

# 49. Cambio de velocidad

`0.5×`, `1×`, `2×` debe afectar:

- física;
- `pausa()`;
- `millis()`;
- espera de 70 ms;
- cualquier temporizador simulado.

El resultado lógico debe ser el mismo, solo cambia la velocidad de observación.

---

# 50. Runtime y Worker

Mantener el Worker actual.

Su loop puede evolucionar desde:

```ts
engine.tick()
```

a:

```ts
runtime.step(instructionBudget)
engine.tick()
```

pero cuidar orden temporal.

Propuesta:

```txt
cada physics step:
    runtime ejecuta hasta ceder/budget
    engine integra física
    sensores se actualizan
    runtime puede continuar en siguiente step
```

Validar casos donde una lectura de sensor ocurre después de un movimiento.

---

# 51. Determinismo

Tests deben poder ejecutar la simulación sin depender de:

```txt
setInterval real
requestAnimationFrame
performance.now
```

Extraer una forma de avanzar manualmente:

```ts
step(ms)
```

para tests.

El Worker puede usar reloj real, los tests no.

---

# 52. Parser: posiciones fuente

Cada nodo AST debe conservar:

```ts
SourceLocation {
  startLine
  startColumn
  endLine
  endColumn
}
```

Necesario para Monaco diagnostics.

---

# 53. Ejemplo mínimo que DEBE funcionar

Este ejemplo es solo un smoke test técnico, no una solución completa de S01:

```cpp
#include <KnightRoboticsLibs_Iroh.h>

void setup() {
  inicializarMovimiento();
  inicializarSensores();
  inicializarPantalla();
}

void loop() {
  int centro = leerSensorLineaCentral();

  if (centro > 200) {
    avanzar(40);
  } else {
    girarDerecha(30);
  }

  pausa(20);
}
```

Debe provocar movimiento observable.

---

# 54. Ejemplo de LCD que DEBE funcionar

```cpp
void setup() {
  inicializarPantalla();
  escribirPantalla(0, 0, "HOLA");
  escribirPantalla(0, 1, 123);
}

void loop() {
}
```

La UI debe mostrar:

```txt
HOLA
123
```

respetando posiciones.

---

# 55. Ejemplo pausa que DEBE funcionar

```cpp
void setup() {
  inicializarMovimiento();
}

void loop() {
  avanzar(40);
  pausa(1000);
  detenerse();
  pausa(1000);
}
```

Esperado:

- avanza durante la pausa;
- luego frena;
- espera;
- vuelve al loop.

Nunca congelar navegador.

---

# 56. Ejemplo de protección que DEBE funcionar

```cpp
void setup() {
}

void loop() {
  while (true) {
  }
}
```

Esperado:

- Worker no se congela;
- UI sigue interactiva;
- estado `error`;
- diagnóstico pedagógico.

---

# 57. Ejemplo finPrograma()

```cpp
void setup() {
  inicializarPantalla();
  escribirPantalla(0, 0, "FIN");
  pausa(500);
  finPrograma();
}

void loop() {
}
```

Esperado:

- termina controladamente;
- status `finished`;
- motores detenidos;
- pantalla limpia/apagada según API real;
- no ExecutionLimitError.

---

# 58. Programas de referencia S01

Crear:

```txt
src/tests/reference-programs/
  s01-left.cpp
  s01-right.cpp
  infinite-loop.cpp
  lcd.cpp
  pause.cpp
```

Los programas `s01-left.cpp` y `s01-right.cpp` deben resolver internamente el desafío.

No incluirlos en assets públicos ni UI.

Son fixtures de test.

---

# 59. Prueba completa S01 izquierda

Given:

```txt
IR izquierdo activo
IR derecho libre
```

When:

```txt
ejecutar programa de referencia izquierdo
```

Then:

- LCD muestra decisión correspondiente;
- IROH sigue lado esperado;
- detecta obstáculo;
- se detiene/actúa correctamente;
- servo mueve caja al lado contrario;
- robot continúa;
- alcanza base final;
- ambos IR pueden activarse;
- programa logra detener robot;
- no hay runtime error.

---

# 60. Prueba completa S01 derecha

Mismo flujo invertido.

Esta prueba es obligatoria.

---

# 61. Tests unitarios mínimos

## Tokenizer

- keywords;
- identificadores;
- números;
- strings;
- comments;
- operadores;
- source positions.

## Parser

- declarations;
- assignment;
- if/else;
- while;
- for;
- function declaration;
- function calls;
- nested blocks.

## Interpreter

- scopes;
- arithmetic;
- conditions;
- loops;
- functions;
- pause/resume;
- instruction budget.

## Adapter

- movimiento;
- línea;
- IR;
- sonar;
- LCD;
- botón;
- servo;
- finPrograma.

---

# 62. Tests de regresión existentes

NO romper las pruebas actuales de:

- differential physics;
- geometría S01;
- line coverage;
- sonar;
- IR majority;
- pause/resume engine;
- collision;
- snapshot immutability.

Actualizar tests únicamente cuando una conducta deliberadamente cambie.

Ejemplo:

La prueba actual:

```txt
stops at a collision without penetrating a box
```

puede seguir siendo válida para colisión frontal, pero debe complementarse con la interacción de servo.

---

# 63. E2E obligatorio

Agregar Playwright:

```txt
abrir S01
→ escribir programa mínimo
→ Ejecutar
→ status running
→ robot cambia posición
→ pausa
→ posición se congela
→ continuar
→ posición cambia
→ reiniciar
→ vuelve a posición inicial
→ código permanece en editor
```

También:

```txt
escribir código inválido
→ Ejecutar
→ error Monaco
→ robot no se mueve
```

---

# 64. UI móvil

La vista móvil actual usa tabs.

Conservar:

```txt
Tu código
Pista y desafío
```

Cuando se pulsa Ejecutar en móvil:

- puede cambiar automáticamente a `Pista y desafío`;
- mostrar mensaje breve:
  > Programa iniciado. Observa al IROH.

No forzar si afecta accesibilidad; evaluar UX.

---

# 65. No avanzar a S02

Este punto es explícito.

Durante este encargo:

## Sí

- completar S01;
- mejorar arquitectura necesaria;
- mejorar tests;
- corregir bugs relacionados.

## No

- implementar motor S02;
- implementar S03;
- importar nuevas físicas;
- hacer dashboard profesor;
- login;
- nube;
- backend;
- rankings.

S01 debe quedar sólida antes de ampliar.

---

# 66. Mantener trazabilidad

Actualizar:

```txt
docs/iroh-api.md
docs/fuentes-y-decisiones.md
README.md
```

Registrar decisiones importantes:

- qué parte replica la librería exactamente;
- qué parte es aproximación física;
- límites del parser;
- límites del runtime;
- comportamiento de caja;
- comportamiento del servo.

---

# 67. README al terminar

Cambiar claramente la declaración:

```txt
Todavía no ejecuta el código del estudiante
```

solo cuando sea cierto.

No declarar:

```txt
S01 completa
```

hasta pasar los tests de referencia izquierda y derecha.

---

# 68. Calidad del código

Evitar:

- `any`;
- archivos gigantes;
- parser basado completamente en regex;
- switch de 500 líneas;
- lógica de UI dentro del runtime;
- lógica de física dentro del parser;
- side effects no deterministas;
- funciones públicas sin tests.

Preferir módulos pequeños y tipados.

---

# 69. Commits / orden sugerido

Si Codex trabaja con Git, dividir conceptualmente:

```txt
1. runtime: tokenizer + AST + parser
2. runtime: interpreter + cooperative scheduler
3. simulator: IrohRuntimeAdapter
4. simulator: LCD + timing semantics
5. simulator: strike servo + movable box
6. ui: run/review/diagnostics
7. tests: runtime + S01 left/right
8. docs: update milestone status
```

No es obligatorio usar exactamente estos commits, pero mantener separaciones lógicas.

---

# 70. Criterios de aceptación del hito

El hito termina únicamente si se cumplen TODOS:

- [ ] El código escrito en Monaco controla el robot.
- [ ] No se usa `eval` ni `new Function`.
- [ ] `setup()` funciona.
- [ ] `loop()` funciona.
- [ ] `if/else` funciona.
- [ ] `while` funciona.
- [ ] `for` funciona si es necesario para el material.
- [ ] Variables funcionan.
- [ ] Funciones auxiliares funcionan.
- [ ] `avanzar()` controla motores.
- [ ] `retroceder()` controla motores.
- [ ] `girarIzquierda()` funciona.
- [ ] `girarDerecha()` funciona.
- [ ] `detenerse()` respeta tiempo conceptual de freno.
- [ ] `pausa()` no bloquea.
- [ ] `leerSensorLinea...()` devuelve geometría real.
- [ ] `leerSensorObstaculo...()` lee estímulo IR.
- [ ] filtro IR está representado.
- [ ] sonar devuelve el valor correcto.
- [ ] LCD 16×2 funciona.
- [ ] botón funciona.
- [ ] `moverServoGolpe()` funciona.
- [ ] caja S01 puede moverse.
- [ ] `finPrograma()` termina limpiamente.
- [ ] loop infinito no bloquea navegador.
- [ ] errores se marcan en Monaco.
- [ ] Reiniciar conserva código.
- [ ] Pausar/reanudar conserva ejecución.
- [ ] velocidad 0.5×/1×/2× conserva lógica temporal.
- [ ] programa referencia S01 izquierda completa la pista.
- [ ] programa referencia S01 derecha completa la pista.
- [ ] unit tests pasan.
- [ ] E2E pasa.
- [ ] build pasa.
- [ ] UI actual no sufre regresiones importantes.

---

# 71. Entrega requerida de Codex

Al finalizar, entregar un resumen con:

## Implementado

Lista concreta.

## Archivos nuevos

Lista.

## Archivos modificados

Lista.

## Tests

Comandos ejecutados:

```txt
pnpm test
pnpm test:e2e
pnpm build
```

y resultado.

## Limitaciones conocidas

No ocultarlas.

## Fidelidad

Separar:

```txt
comportamiento replicado de librería real
```

de:

```txt
parámetros físicos todavía provisionales
```

## Capturas

Generar:

```txt
S01 código ejecutándose
S01 LCD activa
S01 caja movida
S01 error de compilación
S01 móvil
```

---

# 72. Instrucción final a Codex

No optimices por cantidad de funcionalidades.

Optimiza por una sola experiencia completa:

> Un estudiante escribe código de IROH para la Sesión 1, pulsa Ejecutar, el robot virtual obedece ese código, lee la pista y sensores reales de la simulación, usa LCD y servo, puede mover el obstáculo y el alumno puede observar, corregir y volver a probar sin recargar la aplicación.

Hasta que eso funcione de extremo a extremo, **no avanzar a las demás sesiones**.

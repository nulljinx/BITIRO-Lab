# API real de IROH — auditoría V4

Fuente local: `Documents/Arduino/libraries/KnightRoboticsLibs_Iroh_V4`. Cabecera 03/03/2023; implementación declara 30/04/2026 y filtro IR ajustado mayo 2026. Inspección: 16/09/2026.

**Estado:** API documentada, no adaptador de código de estudiante implementado en el hito 1. Las órdenes manuales son internas, en cm/s; no son funciones Arduino.

| Firma declarada | Parámetros/rango | Retorno | Efectos y observaciones |
|---|---|---|---|
| `void retroceder(int vel);` | vel o velIzq/velDer: int; uso educativo 0–100 | void | Mismo mapeo PWM que avanzar, invierte dirección. Cambio de modo: espera 70 ms. |
| `void retroceder(int velIzq, int velDer);` | vel o velIzq/velDer: int; uso educativo 0–100 | void | Mismo mapeo PWM que avanzar, invierte dirección. Cambio de modo: espera 70 ms. |
| `void avanzar(int vel);` | vel o velIzq/velDer: int; uso educativo 0–100 | void | Limita solo valores >100; PWM conceptual = 50 + vel. Cambiar de modo llama detenerse() (70 ms). 0 no detiene. Negativos no están acotados en el original. |
| `void avanzar(int velIzq, int velDer);` | vel o velIzq/velDer: int; uso educativo 0–100 | void | Limita solo valores >100; PWM conceptual = 50 + vel. Cambiar de modo llama detenerse() (70 ms). 0 no detiene. Negativos no están acotados en el original. |
| `void detenerse();` | sin argumentos | void | Ambos pines de cada motor HIGH, delay(70), movement=0. |
| `void girarDerecha(int vel);` | vel: int; uso educativo 0–100 | void | Izquierdo adelante, derecho atrás. Mismo mapeo PWM y freno al cambiar modo. |
| `void girarIzquierda(int vel);` | vel: int; uso educativo 0–100 | void | Izquierdo atrás, derecho adelante. Mismo mapeo PWM y freno al cambiar modo. |
| `void inicializarMovimientoRobot();` | sin argumentos | void | Configura salidas y frena eléctricamente, sin el delay de detenerse(). Alias con implementación equivalente. |
| `void inicializarCabezaRobot();` | sin argumentos | void | Adjunta Yaw pin7 y Pitch pin8; manda 90 y 40 grados. Alias con implementación equivalente. |
| `void inicializarGolpeRobot();` | sin argumentos | void | Adjunta servo pin9 y llama moverServoGolpe(0). En estado inicial 0 esa llamada no escribe ángulo; no asumir centrado físico. Alias con implementación equivalente. |
| `void inicializarSensoresRobot();` | sin argumentos | void | IR INPUT_PULLUP; pulsador INPUT. Sensores de línea se leen por analogRead. Alias con implementación equivalente. |
| `void inicializarPantallaRobot();` | sin argumentos | void | Detecta 0x27/0x3F, inicializa LCD16x2, enciende backlight y escribe KnightRobotics desde (1,0). Alias con implementación equivalente. |
| `void apagarCabezaRobot();` | sin argumentos | void | Desadjunta los servos Yaw/Pitch. Alias con implementación equivalente. |
| `void inicializarMovimiento();` | sin argumentos | void | Configura salidas y frena eléctricamente, sin el delay de detenerse(). |
| `void inicializarCabeza();` | sin argumentos | void | Adjunta Yaw pin7 y Pitch pin8; manda 90 y 40 grados. |
| `void inicializarGolpe();` | sin argumentos | void | Adjunta servo pin9 y llama moverServoGolpe(0). En estado inicial 0 esa llamada no escribe ángulo; no asumir centrado físico. |
| `void inicializarSensores();` | sin argumentos | void | IR INPUT_PULLUP; pulsador INPUT. Sensores de línea se leen por analogRead. |
| `void inicializarPantalla();` | sin argumentos | void | Detecta 0x27/0x3F, inicializa LCD16x2, enciende backlight y escribe KnightRobotics desde (1,0). |
| `void apagarCabeza();` | sin argumentos | void | Desadjunta los servos Yaw/Pitch. |
| `void moverServoYaw(int pos);` | pos: int | void | Pasa pos a Servo.write. En modo grados usa 0–180; dependencia también acepta microsegundos por encima de MIN_PULSE_WIDTH. No hay clamp propio. |
| `void moverServoPitch(int pos);` | pos: int | void | Pasa pos a Servo.write. No hay clamp propio; verificar comportamiento de dependencia antes del adapter. |
| `void moverServoGolpe(int pos);` | pos: -1, 0, 1 | void | -1→165°, 0→90°, 1→15°. Escribe solo al cambiar estado. Valores distintos se ignoran. Sin espera propia. |
| `int leerBoton();` | sin argumentos | int 0/1 | digitalRead(pin4), sin filtro. |
| `void botonInicio();` | sin argumentos | void | Espera hasta leerBoton()==1. El runtime suspende cooperativamente. |
| `int leerDistanciaSonar();` | sin argumentos | int cm | NewPing máximo 300cm. Retorna dist solo si dist>5; retorna 0 para ≤5 y sin eco. NO_ECHO=0 en NewPing.h. |
| `int leerSensorLineaIzquierdo();` | sin argumentos | int ADC | analogRead(A2), 0–1023 en el material del taller. |
| `int leerSensorLineaCentral();` | sin argumentos | int ADC | analogRead(A1), 0–1023. La librería no invierte polaridad ni aplica umbral. |
| `int leerSensorLineaDerecho();` | sin argumentos | int ADC | analogRead(A0), 0–1023. |
| `int leerSensorObstaculoIzquierdo();` | sin argumentos | int 0/1 | Mayoría de 3 muestras !digitalRead(pin2); dos separaciones de 200µs. Devuelve 1 activo. |
| `int leerSensorObstaculoDerecho();` | sin argumentos | int 0/1 | Mayoría de 3 muestras !digitalRead(pin10); dos separaciones de 200µs. Devuelve 1 activo. |
| `void escribirPantalla(int col, int fil, const char Text[]);` | col:int, fil:int, texto:const char[] o Number:int | void | Cursor y print. Posiciones visibles col0–15, fil0–1; no borra caracteres anteriores ni limita entradas. El simulador muestra la ventana 16x2. |
| `void escribirPantalla(int col, int fil, int Number);` | col:int, fil:int, texto:const char[] o Number:int | void | Cursor y print. Posiciones visibles col0–15, fil0–1; no borra caracteres anteriores ni limita entradas. El simulador muestra la ventana 16x2. |
| `void apagarPantalla();` | sin argumentos | void | Apaga backlight sin borrar contenido. |
| `void prenderPantalla();` | sin argumentos | void | Enciende backlight. |
| `void borrarPantalla();` | sin argumentos | void | Limpia LCD. |
| `void finPrograma();` | sin argumentos | void | Detiene, borra, apaga y entra en bucle infinito deliberado. Runtime: estado terminado, no error de presupuesto. |
| `void pausa(int tiempo);` | tiempo:int, milisegundos | void | Llama delay(tiempo). No detiene motores. Runtime: espera por tiempo simulado. |

## Diferencias que prevalecen sobre el diseño

- No existen `leerSensorIRIzquierdo` ni `leerSensorIRDerecho`: utilizar `leerSensorObstaculo...`.
- El sonar sin eco devuelve 0; no 300.
- El material S01 enseña blanco 25–33 y negro 376–411. Se usa blanco28/negro395/umbral200 como calibración inicial editable; no valores garantizados de hardware.
- PWM50 con velocidad0 significa que 0 no es sinónimo de detenerse.
- `detenerse()` y cambios de modo consumen 70 ms; el adapter preserva ese tiempo simulado.
- El servo de golpe recibe -1/0/1, no un ángulo público.
- S01 requiere el servo de golpe, confirmado en las diapositivas.

## Trazabilidad

- `KnightRoboticsLibs_Iroh.h` SHA-256: `089c737cca4102b09887f824cb7a0a07c3af1c70a41d2c7f803b313cad0828b6`.
- `KnightRoboticsLibs_Iroh.cpp` SHA-256: `5e0ecaa6c92505f8e78bddec1a053463f383aca3b7a2b9e1b35eddb6b4c21b14`.

## Adapter implementado en hito 2

`signatures.ts` y `IrohRuntimeAdapter.ts` reconocen las funciones requeridas de movimiento, cuatro inicializaciones y sus alias Robot, sensores de línea e IR, sonar, botón, LCD, golpe, pausa, fin y la primitiva Arduino millis. Los servos de cabeza no forman parte de este runtime S01.

- Conversión física: `(50 + min(100, velocidad)) / 150 * 28 cm/s`; se rechazan velocidades negativas. La librería limita solo el extremo superior; la validación negativa es una decisión pedagógica explícita.
- Modo separado para avanzar/retroceder con uno o dos parámetros, como los modos 1/2/5/6 reales. Cambiar parámetros dentro del mismo modo no añade freno. Cambiar modo y detenerse producen 70 ms simulados con motores a cero.
- LCD inicial: `KnightRobotics` desde columna 1, fila 0, con backlight. Solo escribe tras inicializar; imprime sin borrar el resto. Se rechazan cursores fuera de 0–15 / 0–1, se recorta texto en el borde derecho y no se reproduce memoria DDRAM ni salto a filas ocultas.
- El ejemplo que imprime HOLA sin borrar muestra `HOLAghtRobotics ` por la sobrescritura real. Usar borrarPantalla() para mostrar solo HOLA.
- `apagarPantalla` conserva caracteres con iluminación apagada. La UI los muestra atenuados.
- IR: majorityIR recibe tres muestras iguales del estímulo instantáneo. Se conserva voto mayoritario; no se añaden los dos intervalos de 200 µs al reloj de 10 ms ni se inventa ruido.
- `inicializarSensores` no tiene efecto observable adicional: la geometría de los sensores virtuales ya existe. `inicializarMovimiento` deja motores en cero.
- El servo se adjunta con inicializarGolpe; antes de adjuntarlo una orden cambia su estado lógico, sin movimiento físico. Se conserva el estado lógico inicial 0 y escritura solo al cambiarlo. Se dibuja inicialmente a 90° por conveniencia; en hardware el primer moverServoGolpe(0) puede no escribir por coincidir con el estado inicial.
- Posiciones de servo fuera de -1/0/1 generan ArgumentError; la librería las ignora. No es una corrección silenciosa.
- Esperas cooperativas, botón y finPrograma no bloquean. finPrograma se traduce a finished, no a un bucle infinito de usuario.
- Se exigen enteros/bool para argumentos int; no se emula toda conversión implícita de C++. pausa admite 0–600000 ms, frente al rango de hardware. El runtime usa enteros seguros de JavaScript para int/long y float de 64 bits, sin overflow/rollover AVR.

Permanece pendiente calibrar físicamente velocidades, dimensiones y mecánica; esta entrega valida la lógica virtual.

export interface MentorSolution {
  title:string;
  note:string;
  source:string;
}

export const mentorSolutions:Record<string,MentorSolution>={
  s01:{
    title:'Solución de referencia · S01',
    note:'Referencia construida con lo trabajado en S01: setup solo inicializa; en loop se leen los IR, se guarda el lado con una variable de estado, se sigue la línea con el sensor central y un umbral, y al llegar a la base se detecta y golpea el obstáculo.',
    source:`// BITIRO Lab · Sesión 01
// Solución de referencia para mentor
#include <KnightRoboticsLibs_Iroh.h>

int lado = 0;          // 1 = izquierda, 2 = derecha
int flag = 0;          // 0 = falta elegir lado, 1 = lado elegido
int terminado = 0;     // 0 = recorriendo, 1 = desafío terminado

int irIzq = 0;
int irDer = 0;
int sensorCentro = 0;
int distancia = 0;
int umbral = 200;      // Reemplazar por el valor obtenido al calibrar.

void setup() {
  // En setup solo inicializamos las partes del IROH que usaremos.
  inicializarMovimiento();
  inicializarSensores();
  inicializarPantalla();
  inicializarGolpe();
}

void loop() {

  // PRIMERA SUB-TAREA: leer los IR y guardar el lado elegido.
  if (flag == 0) {
    irIzq = leerSensorObstaculoIzquierdo();
    irDer = leerSensorObstaculoDerecho();

    borrarPantalla();

    if (irIzq == 1 && irDer == 0) {
      lado = 1;
      flag = 1;
      escribirPantalla(0, 0, "IR IZQUIERDO");
    }
    else if (irDer == 1 && irIzq == 0) {
      lado = 2;
      flag = 1;
      escribirPantalla(0, 0, "IR DERECHO");
    }
    else {
      escribirPantalla(0, 0, "ELIGE UN IR");
      detenerse();
      pausa(100);
    }
  }

  // SEGUNDA SUB-TAREA: seguir la línea hasta la base final.
  else if (terminado == 0) {

    distancia = leerDistanciaSonar();

    // TERCERA SUB-TAREA: al llegar, detectar y mover el obstáculo.
    // En clase trabajamos el sonar dentro de un rango confiable.
    if (distancia > 5 && distancia < 12) {
      detenerse();

      // IR izquierdo -> ruta izquierda -> golpe hacia la derecha.
      if (lado == 1) {
        moverServoGolpe(1);
      }
      // IR derecho -> ruta derecha -> golpe hacia la izquierda.
      else {
        moverServoGolpe(-1);
      }

      pausa(1000);
      moverServoGolpe(0);
      pausa(200);
      terminado = 1;
    }
    else {
      sensorCentro = leerSensorLineaCentral();

      // Seguidor de línea con un sensor y movimiento en zig-zag.
      if (lado == 1) {
        if (sensorCentro >= umbral) {
          avanzar(0, 50);
        }
        else {
          avanzar(50, 0);
        }
      }
      else {
        if (sensorCentro >= umbral) {
          avanzar(50, 0);
        }
        else {
          avanzar(0, 50);
        }
      }

      pausa(20);
    }
  }

  // Al terminar el desafío, el IROH queda detenido.
  else {
    detenerse();
  }
}
`,
  },
  s02:{
    title:'Solución de referencia · S02',
    note:'Usa la progresión de S02: variables de estado, tres sensores de línea, detección de intersección y decisión de base con los dos IR. No usa contadores ni ciclo while, que se trabajan en S03.',
    source:`// BITIRO Lab · Sesión 02
// Solución de referencia para mentor
#include <KnightRoboticsLibs_Iroh.h>

int sensorI = 0;
int sensorC = 0;
int sensorD = 0;
int irIzq = 0;
int irDer = 0;
int destino = 0;
int cruceSuperado = 0;

int umbralI = 200;
int umbralC = 200;
int umbralD = 200;

void setup() {
  inicializarMovimiento();
  inicializarSensores();
  inicializarPantalla();

  irIzq = leerSensorObstaculoIzquierdo();
  irDer = leerSensorObstaculoDerecho();

  // DER -> Base 1 | IZQ -> Base 2 | ambos -> Base 3
  if (irDer == 1 && irIzq == 0) {
    destino = 1;
  }
  if (irIzq == 1 && irDer == 0) {
    destino = 2;
  }
  if (irIzq == 1 && irDer == 1) {
    destino = 3;
  }

  borrarPantalla();
  escribirPantalla(0, 0, "Base");
  escribirPantalla(5, 0, destino);
}

void loop() {
  sensorI = leerSensorLineaIzquierdo();
  sensorC = leerSensorLineaCentral();
  sensorD = leerSensorLineaDerecho();

  // Intersección: los tres sensores ven negro.
  if (sensorI >= umbralI && sensorC >= umbralC && sensorD >= umbralD) {
    if (cruceSuperado == 0) {
      detenerse();
      pausa(350);
      cruceSuperado = 1;

      if (destino == 1) {
        girarIzquierda(30);
        pausa(320);
      }
      if (destino == 2) {
        avanzar(30);
        pausa(250);
      }
      if (destino == 3) {
        girarDerecha(30);
        pausa(320);
      }
    }
    else {
      // La segunda franja negra corresponde a la base final.
      detenerse();
    }
  }
  else if (sensorI < umbralI && sensorC >= umbralC && sensorD < umbralD) {
    avanzar(30);
  }
  else if (sensorI >= umbralI) {
    avanzar(15, 30);
  }
  else if (sensorD >= umbralD) {
    avanzar(30, 15);
  }
}
`,
  },
  s03:{
    title:'Solución de referencia · S03',
    note:'Una forma posible de resolver el desafío con los contenidos de S03: contador, ciclo while, sonar, tres sensores, Golpe e intersecciones. Antes de mostrarla, deja que el grupo pruebe y compare sus propias estrategias.',
    source:`// BITIRO Lab · Sesión 03
// Solución de referencia para mentor
#include <KnightRoboticsLibs_Iroh.h>

const int UMBRAL_I = 200,
          UMBRAL_C = 200,
          UMBRAL_D = 200;

int si = 0, sc = 0, sd = 0;
int distancia = 0;
int contadorObstaculos = 0;
int ultimoGiro = 0; // -1 izquierda, 1 derecha
int enInterseccion = 0;

void setup() {
  inicializarMovimiento();
  inicializarSensores();
  inicializarPantalla();
  inicializarGolpe();

  borrarPantalla();
  escribirPantalla(0, 0, "Obstaculos:");
  escribirPantalla(0, 1, contadorObstaculos);
}

void loop() {
  si = leerSensorLineaIzquierdo();
  sc = leerSensorLineaCentral();
  sd = leerSensorLineaDerecho();

  // Intersección: los tres sensores detectan negro.
  if (si >= UMBRAL_I && sc >= UMBRAL_C && sd >= UMBRAL_D) {
    // En esta solución primero completamos el conteo de los 3 obstáculos.
    // Así usamos el contador para decidir cuándo empezar a cambiar de sentido.
    if (contadorObstaculos < 3) {
      avanzar(18);
    }
    else if (enInterseccion == 0) {
      detenerse();
      girarDerecha(35);
      pausa(1200);   // aproximadamente 180° en el simulador
      detenerse();
      enInterseccion = 1;
      ultimoGiro = 0;
    }
    else {
      // Después del giro atravesamos la franja una sola vez para abandonarla.
      avanzar(18);
    }
  }
  else {
    enInterseccion = 0;

    // Línea centrada.
    if (si < UMBRAL_I && sc >= UMBRAL_C && sd < UMBRAL_D) {
      ultimoGiro = 0;
      avanzar(18);
    }
    // Línea hacia la derecha.
    else if (si < UMBRAL_I && sc < UMBRAL_C && sd >= UMBRAL_D) {
      ultimoGiro = 1;
      avanzar(55, 1);
    }
    // Línea hacia la izquierda.
    else if (si >= UMBRAL_I && sc < UMBRAL_C && sd < UMBRAL_D) {
      ultimoGiro = -1;
      avanzar(1, 55);
    }
    // Si los tres ven blanco, buscamos el último lado donde vimos la línea.
    else if (si < UMBRAL_I && sc < UMBRAL_C && sd < UMBRAL_D) {
      if (ultimoGiro == 1) {
        avanzar(50, 1);
      }
      if (ultimoGiro == -1) {
        avanzar(1, 50);
      }
      if (ultimoGiro == 0) {
        avanzar(14);
      }
    }
  }

  distancia = leerDistanciaSonar();

  // El rango sigue el criterio trabajado en la sesión.
  if (distancia > 5 && distancia < 12) {
    detenerse();
    contadorObstaculos++;

    borrarPantalla();
    escribirPantalla(0, 0, "Obstaculos:");
    escribirPantalla(0, 1, contadorObstaculos);

    // Movimiento de abanico trabajado en la sesión: barrimos ambos lados
    // para desplazar la caja sin asumir de qué lado quedó respecto del IROH.
    moverServoGolpe(-1);
    pausa(350);
    moverServoGolpe(1);
    pausa(500);
    moverServoGolpe(0);
    pausa(300);

    // Mientras el mismo obstáculo siga delante, no lo contamos otra vez.
    distancia = leerDistanciaSonar();
    while (distancia > 5 && distancia < 12) {
      pausa(50);
      distancia = leerDistanciaSonar();
    }

    avanzar(16);
    pausa(250);
  }
}
`,
  },

};

export function mentorSolutionFor(sessionId:string){return mentorSolutions[sessionId]??null;}

export interface MentorSolution {
  title:string;
  note:string;
  source:string;
}

export const mentorSolutions:Record<string,MentorSolution>={
  s01:{
    title:'Solución de referencia · S01',
    note:'Trabaja solo los elementos de esta sesión: lectura IR inicial, variable de estado, sensor central de línea, LCD, detección del obstáculo y mecanismo Golpe. No adelanta contadores, while ni seguidor con tres sensores.',
    source:`// BITIRO Lab · Sesión 01
// Solución de referencia para mentor
#include <KnightRoboticsLibs_Iroh.h>

int irIzq = 0;
int irDer = 0;
int sensorCentro = 0;
int distancia = 0;
int lado = 0;       // -1 = izquierda, 1 = derecha
int cajaMovida = 0;
int umbral = 200;   // Reemplazar por el valor obtenido al calibrar.

void setup() {
  inicializarMovimiento();
  inicializarSensores();
  inicializarPantalla();
  inicializarGolpe();

  irIzq = leerSensorObstaculoIzquierdo();
  irDer = leerSensorObstaculoDerecho();

  borrarPantalla();

  if (irIzq == 1 && irDer == 0) {
    lado = -1;
    escribirPantalla(0, 0, "IR IZQUIERDO");
  }

  if (irDer == 1 && irIzq == 0) {
    lado = 1;
    escribirPantalla(0, 0, "IR DERECHO");
  }
}

void loop() {
  sensorCentro = leerSensorLineaCentral();
  distancia = leerDistanciaSonar();

  // Cuando la caja queda frente al sonar, el robot se detiene y la mueve
  // hacia el lado contrario al estímulo IR inicial.
  if (cajaMovida == 0 && distancia > 5 && distancia < 14) {
    detenerse();

    if (lado == -1) {
      moverServoGolpe(1);
    }

    if (lado == 1) {
      moverServoGolpe(-1);
    }

    pausa(350);
    moverServoGolpe(0);
    pausa(300);
    cajaMovida = 1;
  }

  // En S01 usamos el sensor central. Si pierde la línea, buscamos nuevamente
  // hacia el lado elegido al inicio.
  if (sensorCentro >= umbral) {
    avanzar(30);
  }
  else {
    if (lado == -1) {
      avanzar(12, 30);
    }
    if (lado == 1) {
      avanzar(30, 12);
    }
  }

  // En la actividad, ambos IR indican la detención final.
  irIzq = leerSensorObstaculoIzquierdo();
  irDer = leerSensorObstaculoDerecho();

  if (irIzq == 1 && irDer == 1) {
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
      avanzar(55, 0);
    }
    // Línea hacia la izquierda.
    else if (si >= UMBRAL_I && sc < UMBRAL_C && sd < UMBRAL_D) {
      ultimoGiro = -1;
      avanzar(0, 55);
    }
    // Si los tres ven blanco, buscamos el último lado donde vimos la línea.
    else if (si < UMBRAL_I && sc < UMBRAL_C && sd < UMBRAL_D) {
      if (ultimoGiro == 1) {
        avanzar(50, 0);
      }
      if (ultimoGiro == -1) {
        avanzar(0, 50);
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

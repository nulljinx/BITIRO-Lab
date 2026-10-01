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

int irIzq;
int irDer;
int sensorCentro;
int distancia;
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
    note:'Referencia construida solo con lo trabajado en S02: variables de estado, lectura de los tres sensores, tres umbrales, cuatro casos del seguidor (centro, derecha, izquierda e intersección) y elección de una de las tres bases con los IR y la alternativa del pulsador para Base 3.',
    source:`// BITIRO Lab · Sesión 02
// Solución de referencia para mentor
#include <KnightRoboticsLibs_Iroh.h>

int sensorI;
int sensorC;
int sensorD;

int irIzq;
int irDer;
int boton;

int destino = 0;       // 1 = Base 1, 2 = Base 2, 3 = Base 3
int estado = 0;        // 0 = elegir base, 1 = recorrer, 2 = terminado
int cruceSuperado = 0; // 0 = antes del cruce, 1 = después del cruce

// Reemplazar por los valores obtenidos al calibrar cada sensor.
int umbralI = 200;
int umbralC = 200;
int umbralD = 200;

void setup() {
  // En setup solo inicializamos las partes del IROH que usaremos.
  inicializarMovimiento();
  inicializarSensores();
  inicializarPantalla();
}

void loop() {

  // PRIMERA SUB-TAREA: leer los IR y guardar la base elegida.
  if (estado == 0) {
    irIzq = leerSensorObstaculoIzquierdo();
    irDer = leerSensorObstaculoDerecho();
    boton = leerBoton();

    borrarPantalla();

    // IR derecho -> Base 1.
    if (irDer == 1 && irIzq == 0) {
      destino = 1;
      estado = 1;
    }
    // IR izquierdo -> Base 2.
    else if (irIzq == 1 && irDer == 0) {
      destino = 2;
      estado = 1;
    }
    // Ambos IR -> Base 3.
    else if (irIzq == 1 && irDer == 1) {
      destino = 3;
      estado = 1;
    }
    // En la clase también se permite usar el pulsador como alternativa para Base 3.
    else if (boton == 1) {
      destino = 3;
      estado = 1;
    }
    else {
      detenerse();
    }

    if (estado == 1) {
      escribirPantalla(0, 0, "BASE");
      escribirPantalla(5, 0, destino);
    }
  }

  // SEGUNDA SUB-TAREA: seguir la línea con tres sensores.
  else if (estado == 1) {
    sensorI = leerSensorLineaIzquierdo();
    sensorC = leerSensorLineaCentral();
    sensorD = leerSensorLineaDerecho();

    // CASO 4: intersección = los tres sensores ven negro.
    if (sensorI >= umbralI &&
        sensorC >= umbralC &&
        sensorD >= umbralD) {

      // Primera intersección: detenerse un instante y elegir camino.
      if (cruceSuperado == 0) {
        detenerse();
        pausa(350);
        cruceSuperado = 1;

        // La Base 1 está en la rama izquierda del plotter.
        if (destino == 1) {
          girarIzquierda(10);
          pausa(400);
        }
        // La Base 2 continúa por el centro.
        else if (destino == 2) {
          avanzar(12);
          pausa(250);
        }
        // La Base 3 está en la rama derecha del plotter.
        else if (destino == 3) {
          girarDerecha(10);
          pausa(500);
        }

        // Avanzamos un poco para salir de la franja de la intersección.
        avanzar(12);
        pausa(450);
      }
      // La siguiente franja negra corresponde a la base final.
      else {
        detenerse();
        estado = 2;
      }
    }

    // CASO 1: línea en el centro -> avanzar.
    else if (sensorI < umbralI &&
             sensorC >= umbralC &&
             sensorD < umbralD) {
      avanzar(12);
    }

    // CASO 2: línea a la derecha -> girar a la derecha.
    else if (sensorI < umbralI &&
             sensorC < umbralC &&
             sensorD >= umbralD) {
      girarDerecha(10);
    }

    // CASO 3: línea a la izquierda -> girar a la izquierda.
    else if (sensorI >= umbralI &&
             sensorC < umbralC &&
             sensorD < umbralD) {
      girarIzquierda(10);
    }
  }

  // Al llegar a la base final, el IROH queda detenido.
  else {
    detenerse();
  }
}
`,
  },
  s03:{
    title:'Solución de referencia · S03',
    note:'Referencia construida con lo trabajado en S03: seguidor de línea con tres sensores, sonar mostrado en LCD, contador, ciclo while para no contar dos veces el mismo obstáculo e intersecciones con giro de 180°.',
    source:`// BITIRO Lab · Sesión 03
// Solución de referencia para mentor
#include <KnightRoboticsLibs_Iroh.h>

int sensorI;
int sensorC;
int sensorD;
int distancia;

// Reemplazar por los valores obtenidos al calibrar cada sensor.
int umbralI = 200;
int umbralC = 200;
int umbralD = 200;

int contadorObstaculos = 0;

void setup() {
  // En setup solo inicializamos las partes del IROH que usaremos.
  inicializarMovimiento();
  inicializarSensores();
  inicializarPantalla();
}

void loop() {

  sensorI = leerSensorLineaIzquierdo();
  sensorC = leerSensorLineaCentral();
  sensorD = leerSensorLineaDerecho();
  distancia = leerDistanciaSonar();

  // Usamos la LCD para observar el sonar y el contador.
  borrarPantalla();
  escribirPantalla(0, 0, "Dist:");
  escribirPantalla(6, 0, distancia);
  escribirPantalla(0, 1, "Obst:");
  escribirPantalla(6, 1, contadorObstaculos);

  // PRIMERA TAREA: detectar y contar obstáculos.
  if (distancia > 5 && distancia < 12) {
    detenerse();

    contadorObstaculos++;

    borrarPantalla();
    escribirPantalla(0, 0, "Dist:");
    escribirPantalla(6, 0, distancia);
    escribirPantalla(0, 1, "Obst:");
    escribirPantalla(6, 1, contadorObstaculos);

    // Mientras el mismo obstáculo siga delante, no lo contamos otra vez.
    distancia = leerDistanciaSonar();

    while (distancia > 5 && distancia < 12) {
      pausa(50);
      distancia = leerDistanciaSonar();

      borrarPantalla();
      escribirPantalla(0, 0, "Dist:");
      escribirPantalla(6, 0, distancia);
      escribirPantalla(0, 1, "Obst:");
      escribirPantalla(6, 1, contadorObstaculos);
    }
  }

  // SEGUNDA TAREA: responder a una intersección.
  else if (sensorI >= umbralI &&
           sensorC >= umbralC &&
           sensorD >= umbralD) {
    detenerse();
    pausa(200);

    // En el desafío, al encontrar una intersección cambiamos el sentido.
    girarDerecha(35);
    pausa(1200);
    detenerse();

    // Salimos de la franja negra antes de volver al seguidor de línea.
    avanzar(18);
    pausa(450);
  }

  // TERCERA TAREA: seguidor de línea con los tres casos vistos en clase.
  else if (sensorI < umbralI &&
           sensorC >= umbralC &&
           sensorD < umbralD) {
    avanzar(18);
  }

  else if (sensorI < umbralI &&
           sensorC < umbralC &&
           sensorD >= umbralD) {
    girarDerecha(10);
  }

  else if (sensorI >= umbralI &&
           sensorC < umbralC &&
           sensorD < umbralD) {
    girarIzquierda(10);
  }
}
`,
  },

};

export function mentorSolutionFor(sessionId:string){return mentorSolutions[sessionId]??null;}

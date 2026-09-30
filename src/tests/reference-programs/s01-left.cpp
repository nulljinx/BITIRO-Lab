// Fixture privado: estímulo IR left activo.
#include <KnightRoboticsLibs_Iroh.h>
bool izquierda = false;
bool cajaMovida = false;
bool terminado = false;
void setup() {
  inicializarMovimiento();
  inicializarSensores();
  inicializarPantalla();
  inicializarGolpe();
  izquierda = leerSensorObstaculoIzquierdo() == 1;
  borrarPantalla();
  if (izquierda) escribirPantalla(0, 0, "IR IZQUIERDO");
  else escribirPantalla(0, 0, "IR DERECHO");
  // V2 starts behind the departure bar. Approach using the actual sonar.
  avanzar(30);
  while (leerDistanciaSonar() == 0 || leerDistanciaSonar() > 8) { pausa(10); }
  detenerse();
}
void seguirLinea() {
  bool negro = leerSensorLineaCentral() > 200;
  if (negro == izquierda) avanzar(0, 50);
  else avanzar(50, 0);
}
void loop() {
  if (terminado) { pausa(100); return; }
  if (leerSensorObstaculoIzquierdo() && leerSensorObstaculoDerecho()) {
    detenerse(); terminado = true; return;
  }
  int distancia = leerDistanciaSonar();
  if (!cajaMovida && distancia > 0 && distancia < 15) {
    detenerse();
    if (izquierda) moverServoGolpe(1);
    else moverServoGolpe(-1);
    pausa(1200);
    moverServoGolpe(0);
    pausa(300);
    cajaMovida = true;
  }
  seguirLinea();
  pausa(20);
}

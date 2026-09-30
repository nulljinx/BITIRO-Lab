export const signatures:Readonly<Record<string,readonly number[]>>={
 avanzar:[1,2],retroceder:[1,2],detenerse:[0],girarDerecha:[1],girarIzquierda:[1],
 inicializarMovimiento:[0],inicializarMovimientoRobot:[0],inicializarSensores:[0],inicializarSensoresRobot:[0],inicializarPantalla:[0],inicializarPantallaRobot:[0],inicializarGolpe:[0],inicializarGolpeRobot:[0],
 leerSensorLineaIzquierdo:[0],leerSensorLineaCentral:[0],leerSensorLineaDerecho:[0],leerSensorObstaculoIzquierdo:[0],leerSensorObstaculoDerecho:[0],leerDistanciaSonar:[0],leerBoton:[0],botonInicio:[0],
 escribirPantalla:[3],borrarPantalla:[0],apagarPantalla:[0],prenderPantalla:[0],moverServoGolpe:[1],pausa:[1],finPrograma:[0],millis:[0]
};
export const signatureFor=(name:string)=>Object.prototype.hasOwnProperty.call(signatures,name)?signatures[name]:undefined;

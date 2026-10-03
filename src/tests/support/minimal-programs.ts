// Minimal single-primitive fragments for public tests. None of them solves a mission.
const HEAD='#include <KnightRoboticsLibs_Iroh.h>\nvoid setup(){inicializarMovimiento();}\n';
export const MINIMAL_ADVANCE=`${HEAD}void loop(){avanzar(50);}`;
export const MINIMAL_IDLE=`${HEAD}void loop(){avanzar(30);pausa(50);}`;

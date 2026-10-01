import type {SimulationEngine} from '../SimulationEngine';
import type {Execution,RuntimeValue,SourceLocation} from './runtime-types';
import {numberValue,voidValue} from './runtime-types';
import {LanguageError} from './interpreter/RuntimeError';
import {Movement,irohSpeedToCmS} from './Movement';
import {LIMITS} from './runtime-limits';
import {majorityIR} from '../sensors';
export class IrohRuntimeAdapter {
 private movement:Movement;private lcdInitialized=false;private irRead=new Map<string,boolean>();private lineRead=new Set<string>();
 constructor(private engine:SimulationEngine){this.movement=new Movement(engine);}
 *call(name:string,args:RuntimeValue[],loc:SourceLocation):Execution {
  const robot=this.engine.robot;
  const integer=(i:number)=>{const v=args[i];if(!v||!['int','long','bool'].includes(v.type))throw new LanguageError('ArgumentError',`${name}() necesita argumentos enteros.`,loc);return Number(v.value);};
  const speed=(i:number)=>{const n=integer(i);if(n<0)throw new LanguageError('ArgumentError','La velocidad debe ser 0–100; usa retroceder() para retroceder.',loc);return irohSpeedToCmS(n);};
  const clear=()=>this.engine.setLCD(['                ','                ']);
  switch(name){
   case 'inicializarMovimiento':case 'inicializarMovimientoRobot':robot.leftMotor=0;robot.rightMotor=0;this.movement=new Movement(this.engine);break;
   case 'inicializarSensores':case 'inicializarSensoresRobot':break;
   case 'inicializarGolpe':case 'inicializarGolpeRobot':robot.strikeServoAttached=true;this.engine.setServo(0);break;
   case 'avanzar':case 'retroceder':{const sign=name==='avanzar'?1:-1,left=speed(0),right=args.length===2?speed(1):left;return yield* this.movement.move(name+args.length,left*sign,right*sign);}
   case 'girarDerecha':{const v=speed(0);return yield* this.movement.move(name,v,-v);}
   case 'girarIzquierda':{const v=speed(0);return yield* this.movement.move(name,-v,v);}
   case 'detenerse':return yield* this.movement.stop();
   case 'leerSensorLineaIzquierdo':if(!this.lineRead.has('left')){this.lineRead.add('left');this.engine.emit({type:'LINE_SENSOR_READ',side:'left'});}return numberValue(robot.lineLeft);
   case 'leerSensorLineaCentral':if(!this.lineRead.has('center')){this.lineRead.add('center');this.engine.emit({type:'LINE_SENSOR_READ',side:'center'});}return numberValue(robot.lineCenter);
   case 'leerSensorLineaDerecho':if(!this.lineRead.has('right')){this.lineRead.add('right');this.engine.emit({type:'LINE_SENSOR_READ',side:'right'});}return numberValue(robot.lineRight);
   case 'leerSensorObstaculoIzquierdo':case 'leerSensorObstaculoDerecho':{const side=name==='leerSensorObstaculoIzquierdo'?'left':'right',active=side==='left'?robot.irLeft:robot.irRight;if(this.irRead.get(side)!==active){this.engine.emit({type:'IR_READ',side,active});this.irRead.set(side,active);}return numberValue(majorityIR([active,active,active])?1:0);}
   case 'leerDistanciaSonar':return numberValue(this.engine.readSonar());
   case 'leerBoton':this.engine.emit({type:'BUTTON_READ',active:robot.buttonPressed});return numberValue(robot.buttonPressed?1:0);
   case 'botonInicio':if(!robot.buttonPressed)yield {kind:'wait',wait:{type:'button'}};break;
   case 'inicializarPantalla':case 'inicializarPantallaRobot':this.lcdInitialized=true;robot.lcdBacklight=true;this.engine.setLCD([' KnightRobotics ','                ']);break;
   case 'escribirPantalla':{const col=integer(0),row=integer(1);if(col<0||col>15||row<0||row>1)throw new LanguageError('ArgumentError','La LCD usa columnas 0–15 y filas 0–1.',loc);const text=args[2].type==='string'?String(args[2].value):String(integer(2));if(this.lcdInitialized){const rows:[string,string]=[...robot.lcd];rows[row]=(rows[row].slice(0,col)+text+rows[row].slice(col+text.length)).slice(0,16);this.engine.setLCD(rows);}break;}
   case 'borrarPantalla':if(this.lcdInitialized)clear();break;
   case 'apagarPantalla':if(this.lcdInitialized)robot.lcdBacklight=false;break;
   case 'prenderPantalla':if(this.lcdInitialized)robot.lcdBacklight=true;break;
   case 'moverServoGolpe':{const n=integer(0);if(n!==-1&&n!==0&&n!==1)throw new LanguageError('ArgumentError','moverServoGolpe() espera -1, 0 o 1.',loc);this.engine.setServo(n);break;}
   case 'pausa':{const n=integer(0);if(n<0||n>LIMITS.waitMs)throw new LanguageError('ArgumentError','pausa() admite entre 0 y 600000 ms.',loc);yield {kind:'wait',wait:{type:'time',untilSimMs:robot.simTimeMs+n}};break;}
   case 'millis':return {type:'long',value:Math.floor(robot.simTimeMs)};
   case 'finPrograma':yield* this.movement.stop();clear();this.engine.robot.lcdBacklight=false;yield {kind:'finish'};break;
   default:throw new LanguageError('UnknownFunctionError',`La función ${name} no está disponible.`,loc);
  }
  return voidValue;
 }
}

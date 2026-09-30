import type {EventPayload} from './types';
export function feedbackFor(event:EventPayload):string|undefined{
 switch(event.type){
  case 'PROGRAM_STARTED':return 'Tu programa está en marcha. setup() prepara el robot y loop() repite tus instrucciones.';
  case 'PROGRAM_PAUSED':return 'La ejecución y el tiempo están en pausa. Continuar retoma la instrucción pendiente.';
  case 'PROGRAM_FINISHED':return 'Tu programa terminó con finPrograma(): motores detenidos y pantalla apagada.';
  case 'LINE_LOST':return 'Los tres sensores están leyendo superficie blanca. El IROH perdió la línea.';
  case 'LINE_FOUND':return 'Un sensor volvió a detectar la línea. Tu programa puede usar esa lectura para corregir el rumbo.';
  case 'OBSTACLE_DETECTED':return 'Tu programa leyó el sonar y detectó un objeto.';
  case 'OBSTACLE_HIT':return `El servo alcanzó la caja y aplicó un impulso hacia la ${event.side==='left'?'izquierda':'derecha'}.`;
  case 'OBSTACLE_MOVED':return `La caja se desplazó hacia la ${event.side==='left'?'izquierda':'derecha'}. Observa el sonar antes de continuar.`;
  case 'FINISH_REACHED':return 'El IROH llegó a una base. Llegar y detenerse son dos acciones distintas: observa qué decide tu programa.';
  case 'IR_READ':return `Tu programa leyó el IR ${event.side==='left'?'izquierdo':'derecho'} como ${event.active?'activo':'libre'}. Puedes recordar esa información en una variable.`;
  case 'RUNTIME_ERROR':return 'El programa se detuvo por un error. Revisa el mensaje y la línea marcada en el editor.';
 }
}

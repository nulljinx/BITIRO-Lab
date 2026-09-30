import type {RobotState,SimulationEvent,TrackDefinition,LineThresholds,ScenarioIntersection} from './types';
import {ROBOT} from './config';
import {isInsideFinishZone} from './finish';

export interface MissionEvidence {
  sessionId:string;
  status:'in_progress'|'completed';
  checks:readonly {key:string;label:string;passed:boolean}[];
  elapsedMs:number;
  finishZone:string|null;
  progress?:{obstaclesDetected:number;obstacleReads:number;intersectionsResponded:number;lcdValue:number|null;duplicateObstacleRead:boolean};
  /** In-browser practice feedback, not a certified assessment or trusted proof. */
  kind:'formative_client_simulation';
}

/** Pure evidence accumulator: a reset/new run cannot inherit earlier successes. */
export class MissionEvaluator {
 private active=false;
 private initialIR:{left:boolean;right:boolean}|null=null;
 private reads=new Set<'left'|'right'>();
 private lineReads=new Set<'left'|'center'|'right'>();
 private movedSides=new Set<'left'|'right'>();
 private lcdDecision=false;
 private intersection=false;
 private intersectionStopMs=0;
 private distance=0;
 private last:{x:number;y:number}|null=null;
 private lastTickMs=0;
 private completed=false;
 private invalid=false;
 private obstacleDetections=new Set<string>();
 private obstacleReadEvents=0;
 private lcdNumber:number|null=null;
 private scenarioIntersections:ScenarioIntersection[]=[];
 private s03IntersectionActive:string|null=null;
 private s03IntersectionHeading=0;
 private s03IntersectionTurned=false;
 private s03IntersectionResponses=0;
 private lineThresholds:LineThresholds=[ROBOT.threshold,ROBOT.threshold,ROBOT.threshold];
 constructor(private track:TrackDefinition){}
 setLineThresholds(values:LineThresholds){this.lineThresholds=[...values] as LineThresholds;}
 setScenarioIntersections(values:readonly ScenarioIntersection[]){this.scenarioIntersections=values.map(item=>({...item}));}
 reset(){this.active=false;this.initialIR=null;this.reads.clear();this.lineReads.clear();this.movedSides.clear();this.lcdDecision=false;this.intersection=false;this.intersectionStopMs=0;this.distance=0;this.last=null;this.lastTickMs=0;this.completed=false;this.invalid=false;this.obstacleDetections.clear();this.obstacleReadEvents=0;this.lcdNumber=null;this.s03IntersectionActive=null;this.s03IntersectionHeading=0;this.s03IntersectionTurned=false;this.s03IntersectionResponses=0;}
 start(robot:RobotState){this.reset();this.active=true;this.initialIR={left:robot.irLeft,right:robot.irRight};this.last={x:robot.x,y:robot.y};this.lastTickMs=robot.simTimeMs;}
 invalidate(){this.invalid=true;this.active=false;}
 observeEvent(event:SimulationEvent){
  if(!this.active||this.invalid)return;
  if(event.type==='IR_READ')this.reads.add(event.side);
  if(event.type==='LINE_SENSOR_READ')this.lineReads.add(event.side);
  if(event.type==='OBSTACLE_MOVED')this.movedSides.add(event.side);
  if(event.type==='OBSTACLE_DETECTED'){this.obstacleReadEvents++;if(event.obstacleId)this.obstacleDetections.add(event.obstacleId);}
  if(event.type==='LCD_UPDATED'){
   const text=event.rows.join(' ').toUpperCase();
   if(this.initialIR?.left&&!this.initialIR?.right&&text.includes('IR IZQUIERDO'))this.lcdDecision=true;
   if(this.initialIR?.right&&!this.initialIR?.left&&text.includes('IR DERECHO'))this.lcdDecision=true;
   const numbers=text.match(/-?\d+/g);if(numbers?.length)this.lcdNumber=Number(numbers[numbers.length-1]);
  }
 }
 observeTick(robot:RobotState){
  if(!this.active||this.invalid)return;
  if(this.last)this.distance+=Math.hypot(robot.x-this.last.x,robot.y-this.last.y);
  this.last={x:robot.x,y:robot.y};
  const elapsed=Math.max(0,robot.simTimeMs-this.lastTickMs);this.lastTickMs=robot.simTimeMs;
  const intersectionZone=this.track.missionZones?.find(zone=>zone.id==='intersection');
  const insideIntersection=!intersectionZone||(robot.x>=intersectionZone.x&&robot.x<=intersectionZone.x+intersectionZone.width&&robot.y>=intersectionZone.y&&robot.y<=intersectionZone.y+intersectionZone.height);
  const allLineSensorsBlack=[robot.lineLeft,robot.lineCenter,robot.lineRight].every((value,index)=>value>=this.lineThresholds[index]);
  const nearestS03=this.track.id==='s03'?this.scenarioIntersections.map(item=>({item,distance:Math.hypot(robot.x-item.x,robot.y-item.y)})).sort((a,b)=>a.distance-b.distance)[0]:null;
  const currentS03=nearestS03&&nearestS03.distance<=12?nearestS03.item:null;
  const atIntersection=this.track.id==='s03'?!!currentS03&&allLineSensorsBlack:insideIntersection&&allLineSensorsBlack;
  if(atIntersection){this.intersection=true;if(robot.leftMotor===0&&robot.rightMotor===0)this.intersectionStopMs+=elapsed;}
  if(this.track.id==='s03'){
   // Start the observation only when the three line sensors really recognise the
   // horizontal intersection. Once the turn begins, keep observing by position:
   // the sensors rotate away from the stripe during a 180° turn, so requiring
   // black-black-black for the whole manoeuvre used to discard valid responses.
   if(atIntersection&&currentS03&&!this.s03IntersectionActive){
    this.s03IntersectionActive=currentS03.id;this.s03IntersectionHeading=robot.heading;this.s03IntersectionTurned=false;
   }
   if(this.s03IntersectionActive){
    const activePoint=this.scenarioIntersections.find(item=>item.id===this.s03IntersectionActive);
    const nearActive=!!activePoint&&Math.hypot(robot.x-activePoint.x,robot.y-activePoint.y)<=16;
    const delta=Math.abs(Math.atan2(Math.sin(robot.heading-this.s03IntersectionHeading),Math.cos(robot.heading-this.s03IntersectionHeading)));
    if(delta>=2.55)this.s03IntersectionTurned=true;
    if(!nearActive){
     if(this.s03IntersectionTurned)this.s03IntersectionResponses=Math.min(3,this.s03IntersectionResponses+1);
     this.s03IntersectionActive=null;this.s03IntersectionTurned=false;
    }
   }
  }
 }
 evaluate(robot:RobotState):MissionEvidence{
  const zone=isInsideFinishZone(robot,this.track)?.id??null;
  const stationary=robot.leftMotor===0&&robot.rightMotor===0;
  const checks:{key:string;label:string;passed:boolean}[]=[];
  const check=(key:string,label:string,passed:boolean)=>checks.push({key,label,passed:this.active&&!this.invalid&&passed});
  if(this.track.id==='s01'){
   const left=!!this.initialIR?.left&&!this.initialIR?.right;
   const right=!!this.initialIR?.right&&!this.initialIR?.left;
   check('decision','Leer el IR inicial y anunciar la decisión en LCD',this.reads.size>0&&(left||right)&&this.lcdDecision);
   check('line','Usar el sensor central y recorrer la pista',this.lineReads.has('center')&&this.distance>=40);
   check('obstacle','Mover la caja hacia el lado contrario',left?this.movedSides.has('right'):right?this.movedSides.has('left'):false);
   check('finish','Llegar a la base correspondiente y detener ambos motores',stationary&&(left&&zone==='rect270'||right&&zone==='rect272'));
  }else if(this.track.id==='s02'){
   const left=!!this.initialIR?.left,right=!!this.initialIR?.right;
   const expected=left&&right?'base3':right?'base1':left?'base2':null;
   const expectedLabel=expected==='base1'?'Base 1':expected==='base2'?'Base 2':expected==='base3'?'Base 3':null;
   check('ir',expectedLabel?`Leer ambos IR y determinar ${expectedLabel}`:'Leer ambos IR con una señal inicial válida',this.reads.has('left')&&this.reads.has('right')&&!!expected);
   check('line','Leer los tres sensores de línea durante el recorrido',this.lineReads.size===3&&this.distance>=50);
   check('cross','Reconocer el cruce central y detenerse al menos 0,3 s',this.intersection&&this.intersectionStopMs>=300);
   check('finish',expectedLabel?`Llegar a ${expectedLabel} y detener ambos motores`:'Llegar a la base indicada y detener ambos motores',stationary&&!!expected&&zone===expected);
  }else if(this.track.id==='s03'){
   check('line','Recorrer la pista leyendo los tres sensores de línea',this.lineReads.size===3&&this.distance>=140);
   check('obstacles',`Detectar 3 obstáculos con sonar (${Math.min(3,this.obstacleDetections.size)}/3)`,this.obstacleDetections.size>=3);
   check('lcd','Mostrar en la LCD el total correcto de obstáculos',this.obstacleDetections.size>=3&&this.lcdNumber===3);
   check('intersections',`Responder a 3 intersecciones con un cambio de sentido de 180° (${Math.min(3,this.s03IntersectionResponses)}/3)`,this.s03IntersectionResponses>=3);
  }
  if(this.active&&!this.invalid&&checks.length>0&&checks.every(item=>item.passed))this.completed=true;
  const progress=this.track.id==='s03'?{obstaclesDetected:Math.min(3,this.obstacleDetections.size),obstacleReads:this.obstacleReadEvents,intersectionsResponded:Math.min(3,this.s03IntersectionResponses),lcdValue:this.lcdNumber,duplicateObstacleRead:this.obstacleReadEvents>this.obstacleDetections.size}:undefined;
  return {sessionId:this.track.id,status:this.completed?'completed':'in_progress',checks,elapsedMs:robot.simTimeMs,finishZone:zone,progress,kind:'formative_client_simulation'};
 }
}

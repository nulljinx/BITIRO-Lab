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
 private initialButton=false;
 private reads=new Set<'left'|'right'>();
 private buttonRead=false;
 private lineReads=new Set<'left'|'center'|'right'>();
 private lineLostEvents=0;
 private movedSides=new Set<'left'|'right'>();
 private lcdDecision=false;
 private intersection=false;
 private intersectionStopMs=0;
 private distance=0;
 private last:{x:number;y:number}|null=null;
 private lastTickMs=0;
 private completed=false;
 /** Evidence of the attempt that completed the mission. Terminal: stop, calibration or robot movement cannot change it; only reset()/start() (a new attempt) clear it. */
 private frozen:MissionEvidence|null=null;
 private destinationReached=false;
 private invalid=false;
 private obstacleDetections=new Set<string>();
 private obstacleReadEvents=0;
 private lcdNumber:number|null=null;
 private scenarioIntersections:ScenarioIntersection[]=[];
 private s03IntersectionActive:string|null=null;
 private s03IntersectionHeading=0;
 private s03IntersectionTurned=false;
 private s03IntersectionResponses=0;
 private s03RespondedIntersections=new Set<string>();
 private s04Gap1Seen=false;
 private s04Gap1Crossed=false;
 private s04Gap2Seen=false;
 private s04Intersection1=false;
 private s04Intersection2=false;
 private s04Intersection3=false;
 private s04Intersection1StopMs=0;
 private s04Intersection2StopMs=0;
 private s04Intersection3StopMs=0;
 private s05RightActivations=0;
 private s05LastRight=false;
 private s05LastLeft=false;
 private s05StartedByLeft=false;
 private s05LcdMatchedCount=false;
 private s05GapSeen=false;
 private s05GapCrossed=false;
 private s05JunctionReached=false;
 private s05JunctionStopMs=0;
 private s05JunctionAuthorized=false;
 private s05DestinationReached=false;
 private s05ExpectedBase:string|null=null;
 private lineThresholds:LineThresholds=[ROBOT.threshold,ROBOT.threshold,ROBOT.threshold];
 constructor(private track:TrackDefinition){}
 setLineThresholds(values:LineThresholds){this.lineThresholds=[...values] as LineThresholds;}
 setScenarioIntersections(values:readonly ScenarioIntersection[]){this.scenarioIntersections=values.map(item=>({...item}));}
 reset(){this.active=false;this.initialIR=null;this.initialButton=false;this.reads.clear();this.buttonRead=false;this.lineReads.clear();this.lineLostEvents=0;this.movedSides.clear();this.lcdDecision=false;this.intersection=false;this.intersectionStopMs=0;this.distance=0;this.last=null;this.lastTickMs=0;this.completed=false;this.frozen=null;this.destinationReached=false;this.invalid=false;this.obstacleDetections.clear();this.obstacleReadEvents=0;this.lcdNumber=null;this.s03IntersectionActive=null;this.s03IntersectionHeading=0;this.s03IntersectionTurned=false;this.s03IntersectionResponses=0;this.s03RespondedIntersections.clear();this.s04Gap1Seen=false;this.s04Gap1Crossed=false;this.s04Gap2Seen=false;this.s04Intersection1=false;this.s04Intersection2=false;this.s04Intersection3=false;this.s04Intersection1StopMs=0;this.s04Intersection2StopMs=0;this.s04Intersection3StopMs=0;this.s05RightActivations=0;this.s05LastRight=false;this.s05LastLeft=false;this.s05StartedByLeft=false;this.s05LcdMatchedCount=false;this.s05GapSeen=false;this.s05GapCrossed=false;this.s05JunctionReached=false;this.s05JunctionStopMs=0;this.s05JunctionAuthorized=false;this.s05DestinationReached=false;this.s05ExpectedBase=null;}
 start(robot:RobotState){this.reset();this.active=true;this.initialIR={left:robot.irLeft,right:robot.irRight};this.initialButton=robot.buttonPressed;this.last={x:robot.x,y:robot.y};this.lastTickMs=robot.simTimeMs;}
 /** Manual stop / natural end: close the attempt keeping what it achieved. The evidence is evaluated while the attempt is still valid and frozen as in_progress (or completed, if every check already passes); nothing later (IR, sensors, motion) can change it. reset()/start() clear it. */
 stopAttempt(robot:RobotState){
  if(!this.active||this.invalid||this.frozen)return;
  const evidence=this.evaluate(robot);
  if(!this.frozen)this.frozen={...evidence,checks:evidence.checks.map(item=>({...item})),progress:evidence.progress?{...evidence.progress}:undefined};
  this.active=false;
 }
 /** Manual manipulation (pose, calibration, motor test, runtime error): the attempt is void. A completed attempt stays terminal; a frozen partial one is discarded. */
 invalidate(){this.invalid=true;this.active=false;if(!this.completed)this.frozen=null;}
 observeEvent(event:SimulationEvent){
  if(!this.active||this.invalid)return;
  if(event.type==='IR_READ')this.reads.add(event.side);
  if(event.type==='BUTTON_READ')this.buttonRead=true;
  if(event.type==='LINE_SENSOR_READ')this.lineReads.add(event.side);
  if(event.type==='LINE_LOST')this.lineLostEvents++;
  if(event.type==='OBSTACLE_MOVED')this.movedSides.add(event.side);
  if(event.type==='OBSTACLE_DETECTED'){this.obstacleReadEvents++;if(event.obstacleId)this.obstacleDetections.add(event.obstacleId);}
  if(event.type==='INTERSECTION_RESPONDED'){this.s03RespondedIntersections.add(event.intersectionId);this.s03IntersectionResponses=this.s03RespondedIntersections.size;}
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
  if(this.track.id==='s01'&&this.initialIR){
   const expectedId=this.initialIR.left&&!this.initialIR.right?'rect270':this.initialIR.right&&!this.initialIR.left?'rect272':null;
   const expected=expectedId?this.track.finishZones.find(zone=>zone.id===expectedId):null;
   if(expected){
    const nearestX=Math.max(expected.x,Math.min(robot.x,expected.x+expected.width));
    const nearestY=Math.max(expected.y,Math.min(robot.y,expected.y+expected.height));
    if(Math.hypot(robot.x-nearestX,robot.y-nearestY)<=ROBOT.radiusCm)this.destinationReached=true;
   }
  }
  if(this.track.id==='s02'&&this.initialIR){
   const expectedId=this.initialIR.left&&this.initialIR.right?'base3':this.initialIR.right&&!this.initialIR.left?'base1':this.initialIR.left&&!this.initialIR.right?'base2':!this.initialIR.left&&!this.initialIR.right&&this.initialButton?'base3':null;
   const expected=expectedId?this.track.finishZones.find(zone=>zone.id===expectedId):null;
   if(expected){
    // En S02 el robot se detiene cuando sus sensores delanteros reconocen la
    // franja negra de la base. El centro del chasis queda unos centímetros
    // antes del rectángulo verde, igual que en el montaje físico.
    const front={x:robot.x+Math.cos(robot.heading)*ROBOT.lineFrontCm,y:robot.y+Math.sin(robot.heading)*ROBOT.lineFrontCm};
    const nearestX=Math.max(expected.x,Math.min(front.x,expected.x+expected.width));
    const nearestY=Math.max(expected.y,Math.min(front.y,expected.y+expected.height));
    if(Math.hypot(front.x-nearestX,front.y-nearestY)<=2)this.destinationReached=true;
   }
  }
  const elapsed=Math.max(0,robot.simTimeMs-this.lastTickMs);this.lastTickMs=robot.simTimeMs;
  const intersectionZone=this.track.missionZones?.find(zone=>zone.id==='intersection');
  // La intersección la leen los sensores que van delante del chasis, por eso
  // evaluamos la posición del sensor central y no el centro geométrico del robot.
  const lineFront={x:robot.x+Math.cos(robot.heading)*ROBOT.lineFrontCm,y:robot.y+Math.sin(robot.heading)*ROBOT.lineFrontCm};
  const insideIntersection=!intersectionZone||(lineFront.x>=intersectionZone.x&&lineFront.x<=intersectionZone.x+intersectionZone.width&&lineFront.y>=intersectionZone.y&&lineFront.y<=intersectionZone.y+intersectionZone.height);
  const allLineSensorsBlack=[robot.lineLeft,robot.lineCenter,robot.lineRight].every((value,index)=>value>=this.lineThresholds[index]);
  const nearestS03=this.track.id==='s03'?this.scenarioIntersections.map(item=>({item,distance:Math.hypot(robot.x-item.x,robot.y-item.y)})).sort((a,b)=>a.distance-b.distance)[0]:null;
  const currentS03=nearestS03&&nearestS03.distance<=12?nearestS03.item:null;
  const atIntersection=this.track.id==='s03'?!!currentS03&&allLineSensorsBlack:insideIntersection&&allLineSensorsBlack;
  if(atIntersection){this.intersection=true;if(robot.leftMotor===0&&robot.rightMotor===0)this.intersectionStopMs+=elapsed;}
  if(this.track.id==='s04'){
   const zoneById=(id:string)=>this.track.missionZones?.find(zone=>zone.id===id);
   const inside=(id:string)=>{const zone=zoneById(id);return !!zone&&lineFront.x>=zone.x&&lineFront.x<=zone.x+zone.width&&lineFront.y>=zone.y&&lineFront.y<=zone.y+zone.height;};
   const allWhite=[robot.lineLeft,robot.lineCenter,robot.lineRight].every((value,index)=>value<this.lineThresholds[index]);
   if(inside('gap1')&&allWhite)this.s04Gap1Seen=true;
   const gap1=zoneById('gap1');
   if(this.s04Gap1Seen&&gap1&&lineFront.y<gap1.y-.5)this.s04Gap1Crossed=true;
   if(inside('gap2')&&allWhite)this.s04Gap2Seen=true;
   if(inside('intersection1')&&allLineSensorsBlack){this.s04Intersection1=true;if(robot.leftMotor===0&&robot.rightMotor===0)this.s04Intersection1StopMs+=elapsed;}
   if(inside('intersection2')&&allLineSensorsBlack){this.s04Intersection2=true;if(robot.leftMotor===0&&robot.rightMotor===0)this.s04Intersection2StopMs+=elapsed;}
   if(inside('intersection3')&&allLineSensorsBlack){this.s04Intersection3=true;if(robot.leftMotor===0&&robot.rightMotor===0)this.s04Intersection3StopMs+=elapsed;}
  }
  if(this.track.id==='s05'){
   const zoneById=(id:string)=>this.track.missionZones?.find(zone=>zone.id===id);
   const inside=(id:string)=>{const zone=zoneById(id);return !!zone&&lineFront.x>=zone.x&&lineFront.x<=zone.x+zone.width&&lineFront.y>=zone.y&&lineFront.y<=zone.y+zone.height;};
   const allWhite=[robot.lineLeft,robot.lineCenter,robot.lineRight].every((value,index)=>value<this.lineThresholds[index]);

   // Conteo real de activaciones del estímulo derecho: solo flancos 0 -> 1 y
   // solo antes de que el IR izquierdo autorice el inicio del recorrido.
   if(!this.s05StartedByLeft&&!this.s05LastRight&&robot.irRight)this.s05RightActivations++;
   if(!this.s05StartedByLeft&&!this.s05LastLeft&&robot.irLeft&&this.s05RightActivations>0){
    this.s05StartedByLeft=true;
    this.s05ExpectedBase=this.s05RightActivations===1?'base1':this.s05RightActivations===2?'base2':'base3';
   }
   this.s05LastRight=robot.irRight;
   this.s05LastLeft=robot.irLeft;
   if(this.s05RightActivations>0&&this.lcdNumber===this.s05RightActivations)this.s05LcdMatchedCount=true;

   if(inside('gap')&&allWhite)this.s05GapSeen=true;
   const gap=zoneById('gap');
   if(this.s05GapSeen&&gap&&lineFront.y<gap.y-.5)this.s05GapCrossed=true;

   if(inside('junction')&&allLineSensorsBlack){
    this.s05JunctionReached=true;
    if(robot.leftMotor===0&&robot.rightMotor===0)this.s05JunctionStopMs+=elapsed;
    if(robot.leftMotor===0&&robot.rightMotor===0&&robot.irLeft)this.s05JunctionAuthorized=true;
   }

   if(this.s05ExpectedBase){
    const expected=this.track.finishZones.find(zone=>zone.id===this.s05ExpectedBase);
    if(expected){
     const nearestX=Math.max(expected.x,Math.min(lineFront.x,expected.x+expected.width));
     const nearestY=Math.max(expected.y,Math.min(lineFront.y,expected.y+expected.height));
     if(Math.hypot(lineFront.x-nearestX,lineFront.y-nearestY)<=2)this.s05DestinationReached=true;
    }
   }
  }
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
     if(this.s03IntersectionTurned&&!this.s03RespondedIntersections.has(this.s03IntersectionActive)){
      this.s03RespondedIntersections.add(this.s03IntersectionActive);
      this.s03IntersectionResponses=this.s03RespondedIntersections.size;
     }
     this.s03IntersectionActive=null;this.s03IntersectionTurned=false;
    }
   }
  }
 }
 evaluate(robot:RobotState):MissionEvidence{
  if(this.frozen)return {...this.frozen,checks:this.frozen.checks.map(item=>({...item})),progress:this.frozen.progress?{...this.frozen.progress}:undefined};
  const zone=isInsideFinishZone(robot,this.track)?.id??null;
  const stationary=robot.leftMotor===0&&robot.rightMotor===0;
  const checks:{key:string;label:string;passed:boolean}[]=[];
  const check=(key:string,label:string,passed:boolean)=>checks.push({key,label,passed:this.active&&!this.invalid&&passed});
  if(this.track.id==='s01'){
   const left=!!this.initialIR?.left&&!this.initialIR?.right;
   const right=!!this.initialIR?.right&&!this.initialIR?.left;
   check('decision','Leer el IR inicial y guardar la decisión de ruta',this.reads.size>0&&(left||right)&&this.lcdDecision);
   check('line','Seguir la línea usando el sensor central y un umbral',this.lineReads.has('center')&&this.distance>=40);
   check('finish','Llegar a la base correspondiente',this.destinationReached);
   check('obstacle','Mover el obstáculo hacia el lado contrario',left?this.movedSides.has('right'):right?this.movedSides.has('left'):false);
  }else if(this.track.id==='s02'){
   const left=!!this.initialIR?.left,right=!!this.initialIR?.right;
   const base3WithButton=!left&&!right&&this.initialButton;
   const expected=left&&right?'base3':right&&!left?'base1':left&&!right?'base2':base3WithButton?'base3':null;
   const expectedLabel=expected==='base1'?'Base 1':expected==='base2'?'Base 2':expected==='base3'?'Base 3':null;
   const initialSignalRead=base3WithButton?this.buttonRead:this.reads.has('left')&&this.reads.has('right');
   check('ir',expectedLabel?`Leer la señal inicial y determinar ${expectedLabel}`:'Leer una señal inicial válida',initialSignalRead&&!!expected);
   check('line','Seguir la línea de forma fluida usando los tres sensores',this.lineReads.size===3&&this.distance>=50&&this.lineLostEvents===0);
   check('cross','Reconocer el cruce central y detenerse al menos 0,3 s',this.intersection&&this.intersectionStopMs>=300);
   check('finish',expectedLabel?`Llegar a ${expectedLabel} y detener ambos motores`:'Llegar a la base indicada y detener ambos motores',stationary&&!!expected&&this.destinationReached);
  }else if(this.track.id==='s03'){
   check('line','Recorrer la pista siguiendo la línea con los tres sensores',this.lineReads.size===3&&this.distance>=140);
   check('obstacles',`Detectar 3 obstáculos con sonar (${Math.min(3,this.obstacleDetections.size)}/3)`,this.obstacleDetections.size>=3);
   check('lcd','Mostrar en la LCD el total correcto de obstáculos',this.obstacleDetections.size>=3&&this.lcdNumber===3);
   check('intersections',`Responder a 3 intersecciones con un cambio de sentido de 180° (${Math.min(3,this.s03IntersectionResponses)}/3)`,this.s03IntersectionResponses>=3);
   }else if(this.track.id==='s04'){
   check('line','Seguir la línea usando los tres sensores',this.lineReads.size===3&&this.distance>=95&&this.lineLostEvents===0);
   check('gap1','Cruzar correctamente el primer gap',this.s04Gap1Seen&&this.s04Gap1Crossed&&this.s04Intersection1);
   check('gap2','Atravesar el segundo gap usando while y alcanzar la segunda intersección',this.s04Intersection1StopMs>=900&&this.s04Gap2Seen&&this.s04Intersection2&&this.s04Intersection2StopMs>=900);
   check('finish','Detenerse al llegar a la tercera intersección',this.s04Intersection3&&this.s04Intersection3StopMs>=200&&stationary);
  }else if(this.track.id==='s05'){
   const countLabel=this.s05RightActivations>0?String(this.s05RightActivations):'0';
   const baseLabel=this.s05ExpectedBase==='base1'?'Base 1':this.s05ExpectedBase==='base2'?'Base 2':this.s05ExpectedBase==='base3'?'Base 3':'la base indicada';
   check('counter',`Contar IR derecho y mostrar ${countLabel} en la LCD`,this.s05RightActivations>0&&this.s05LcdMatchedCount);
   check('line','Comenzar con IR izquierdo, seguir la línea y atravesar el gap',this.s05StartedByLeft&&this.lineReads.size===3&&this.s05GapSeen&&this.s05GapCrossed&&this.distance>=85);
   check('junction','Detenerse en la intersección y esperar un nuevo IR izquierdo',this.s05JunctionReached&&this.s05JunctionStopMs>=250&&this.s05JunctionAuthorized);
   check('finish',`Elegir ${baseLabel} según el contador y detenerse en la base final`,!!this.s05ExpectedBase&&this.s05DestinationReached&&stationary);
  }
  if(this.active&&!this.invalid&&checks.length>0&&checks.every(item=>item.passed))this.completed=true;
  const progress=this.track.id==='s03'?{obstaclesDetected:Math.min(3,this.obstacleDetections.size),obstacleReads:this.obstacleReadEvents,intersectionsResponded:Math.min(3,this.s03IntersectionResponses),lcdValue:this.lcdNumber,duplicateObstacleRead:this.obstacleReadEvents>this.obstacleDetections.size}:undefined;
  const evidence:MissionEvidence={sessionId:this.track.id,status:this.completed?'completed':'in_progress',checks,elapsedMs:robot.simTimeMs,finishZone:zone,progress,kind:'formative_client_simulation'};
  if(this.completed)this.frozen={...evidence,checks:evidence.checks.map(item=>({...item})),progress:evidence.progress?{...evidence.progress}:undefined};
  return evidence;
 }
}

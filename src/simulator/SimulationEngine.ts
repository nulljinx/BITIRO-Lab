import type {TrackDefinition,RobotState,Snapshot,Command,Status,DynamicObstacle,SimulationEvent,EventPayload,LineThresholds,Point,ScenarioIntersection} from './types';
import {ROBOT,PHYSICS_STEP_MS} from './config';
import {integrate} from './RobotPhysics';
import {intersectsCircle} from './geometry';
import {updateSensors,sonarHit} from './sensors';
import {advanceActuators} from './actuators';
import {isInsideFinishZone} from './finish';
import {feedbackFor} from './LearningFeedbackEngine';
import {MissionEvaluator} from './MissionEvaluator';
import {S03_FIXED_SCENARIO,S01_BOXES,withScenarioIntersections} from './scenario';
export class SimulationEngine {
 robot!:RobotState;obstacles:DynamicObstacle[]=[];events:SimulationEvent[]=[];
 status:Status='idle';ticks=0;collisions=0;speed=1;instructions=0;programControlled=false;
 feedback='';private sequence=0;private struck=new Set<string>();private touching=false;private onLine=true;private lastZone:string|null=null;private sonarReported=new Set<string>();
 private lineThresholds:LineThresholds=[ROBOT.threshold,ROBOT.threshold,ROBOT.threshold];
 private offLineMs=0;
 private s03ObstaclePoints:Point[]=[];private scenarioIntersections:ScenarioIntersection[]=[];
 private s03ConsumedIntersections=new Set<string>();private s03IntersectionTurn:{id:string;heading:number}|null=null;
 private s03AutoStrike:{obstacleId:string;side:-1|1;contactAt:number;releaseAt:number;returnAt:number;finishAt:number;contacted:boolean;released:boolean}|null=null;
 readonly mission:MissionEvaluator;
 constructor(public readonly track:TrackDefinition){
  this.mission=new MissionEvaluator(track);
  if(track.id==='s03'){
   this.s03ObstaclePoints=S03_FIXED_SCENARIO.obstacles.map(point=>({...point}));
   this.scenarioIntersections=S03_FIXED_SCENARIO.intersections.map((point,index)=>({id:`s03-intersection-${index+1}`,...point}));
   this.mission.setScenarioIntersections(this.scenarioIntersections);
  }
  this.reset();
 }
 reset(){
  this.s03ConsumedIntersections.clear();this.s03IntersectionTurn=null;
  this.obstacles=this.track.id==='s01'?[S01_BOXES.left,S01_BOXES.right].map(o=>({...o,vx:0,vy:0})):this.track.id==='s03'&&this.s03ObstaclePoints.length?this.s03ObstaclePoints.map((point,index)=>({id:`s03-obstacle-${index+1}`,x:point.x-3,y:point.y-3,width:6,height:6,movable:false,blocking:true,vx:0,vy:0})):this.track.obstacles.map(o=>({...o,vx:0,vy:0}));
  // The plotter is a sheet on the floor, not a wall. The IROH body may overhang
  // the paper while its centre is still on the usable surface. Clamp the centre
  // to the sheet instead of forcing the complete robot footprint inside it.
  // This is important on S03, whose official line runs close to the lower edge.
  const safeStart={...this.track.start,
   x:Math.max(0,Math.min(this.track.physicalWidthCm,this.track.start.x)),
   y:Math.max(0,Math.min(this.track.physicalHeightCm,this.track.start.y))};
  this.robot=updateSensors({...safeStart,leftMotor:0,rightMotor:0,lineLeft:0,lineCenter:0,lineRight:0,irLeft:false,irRight:false,sonarCm:0,lcd:['                ','                '],lcdBacklight:false,strikeServoPosition:0,strikeServoAngle:90,strikeServoAttached:this.track.id==='s03',buttonPressed:false,simTimeMs:0},this.scene());
  this.mission.reset();this.status='idle';this.ticks=0;this.collisions=0;this.events=[];this.sequence=0;this.instructions=0;this.programControlled=false;this.struck.clear();this.touching=false;this.lastZone=null;this.onLine=true;this.sonarReported.clear();
  this.offLineMs=0;this.s03AutoStrike=null;
  this.feedback='Robot en el inicio. Escribe tu programa y pulsa Ejecutar en simulador.';
 }
 private scene():TrackDefinition{
  const intersections=this.track.id==='s03'?this.scenarioIntersections.filter(item=>!this.s03ConsumedIntersections.has(item.id)):this.scenarioIntersections;
  return withScenarioIntersections({...this.track,obstacles:this.obstacles},intersections);
 }
 setS03Layout(obstacles:Point[],intersections:Point[]){
  if(this.track.id!=='s03')return;
  const clamp=(point:Point):Point=>({x:Math.max(6,Math.min(this.track.physicalWidthCm-6,point.x)),y:Math.max(6,Math.min(this.track.physicalHeightCm-6,point.y))});
  this.s03ObstaclePoints=obstacles.slice(0,3).map(clamp);
  this.scenarioIntersections=intersections.slice(0,3).map((point,index)=>({id:`s03-intersection-${index+1}`,...clamp(point)}));
  this.mission.setScenarioIntersections(this.scenarioIntersections);
  this.reset();
  this.feedback=`Escenario S03 preparado · ${this.s03ObstaclePoints.length}/3 obstáculos · ${this.scenarioIntersections.length}/3 intersecciones.`;
 }
 setLineThresholds(values:LineThresholds){
  const normalized=values.map(value=>{const numeric=Number(value);return Math.max(0,Math.min(1023,Math.round(Number.isFinite(numeric)?numeric:ROBOT.threshold)));}) as LineThresholds;
  this.lineThresholds=normalized;this.mission.setLineThresholds(normalized);
 }
 emit(event:EventPayload){const recorded={...event,sequence:++this.sequence,timeMs:this.robot.simTimeMs} as SimulationEvent;this.events.push(recorded);this.mission.observeEvent(recorded);if(this.events.length>256)this.events.shift();const text=feedbackFor(event);if(text)this.feedback=text;}
 setLCD(rows:[string,string]){this.robot.lcd=[rows[0],rows[1]];this.emit({type:'LCD_UPDATED',rows:[...rows]});}
 readSonar(){
  const distance=this.robot.sonarCm;
  // En S03 usamos el mismo rango válido trabajado en clase. En vez de hacer
  // desaparecer la caja, ahora la garra la aparta visualmente de la pista.
  const validDetection=this.track.id==='s03'?distance>5&&distance<12:distance>0&&distance<25;
  if(validDetection){
   const hit=sonarHit(this.robot,this.scene());
   const id=hit.obstacleId;
   if(id&&!this.sonarReported.has(id)){
    this.sonarReported.add(id);
    this.emit({type:'OBSTACLE_DETECTED',distance,obstacleId:id});
    if(this.track.id==='s03'){
     const obstacle=this.obstacles.find(item=>item.id===id);
     if(obstacle&&!this.s03AutoStrike){
      const center={x:obstacle.x+obstacle.width/2,y:obstacle.y+obstacle.height/2};
      const outward={x:center.x-this.track.physicalWidthCm/2,y:center.y-this.track.physicalHeightCm/2};
      const right={x:-Math.sin(this.robot.heading),y:Math.cos(this.robot.heading)};
      // La garra elige el lado que aparta la caja hacia el exterior del recorrido.
      const side: -1|1 = outward.x*right.x+outward.y*right.y>=0?1:-1;
      // Secuencia visual controlada: primero barre la garra, luego hace contacto,
      // después desplaza la caja y finalmente vuelve al centro. La caja no se
      // marca como despejada hasta que el movimiento realmente ocurrió.
      obstacle.movable=false;
      obstacle.vx=0;obstacle.vy=0;
      this.robot.strikeServoAttached=true;
      this.setServo(side);
      const now=this.robot.simTimeMs;
      this.s03AutoStrike={obstacleId:id,side,contactAt:now+260,releaseAt:now+680,returnAt:now+720,finishAt:now+1120,contacted:false,released:false};
     }
    }
   }
  }
  return distance;
 }
 setServo(position:-1|0|1){if(position!==this.robot.strikeServoPosition){this.struck.clear();this.robot.strikeServoPosition=position;}}
 command(command:Command){
  switch(command.type){
   case 'reset':this.reset();break;
   case 'pause':if(this.status==='running'){this.status='paused';this.emit({type:'PROGRAM_PAUSED'});}break;
   case 'resume':if(this.status==='paused'){this.status='running';this.feedback='La ejecución continúa desde la instrucción pendiente.';}break;
   case 'stop':this.robot.leftMotor=0;this.robot.rightMotor=0;this.status='idle';this.feedback='Has detenido ambos motores.';break;
   case 'speed':if([.5,1,2].includes(command.value))this.speed=command.value;break;
   case 'motors':{const clamp=(v:number)=>Number.isFinite(v)?Math.max(-ROBOT.maxWheelCmS,Math.min(ROBOT.maxWheelCmS,v)):0;this.robot.leftMotor=clamp(command.left);this.robot.rightMotor=clamp(command.right);this.status='running';this.feedback='Prueba manual de los motores. El programa del estudiante está detenido.';break;}
   case 'ir':this.robot[command.side==='left'?'irLeft':'irRight']=command.value;break;
   case 'button':this.robot.buttonPressed=command.value;break;
   case 'pose':{
    const x=Math.max(ROBOT.radiusCm,Math.min(this.track.physicalWidthCm-ROBOT.radiusCm,command.x));
    const y=Math.max(ROBOT.radiusCm,Math.min(this.track.physicalHeightCm-ROBOT.radiusCm,command.y));
    const heading=Math.atan2(Math.sin(command.heading),Math.cos(command.heading));
    this.robot=updateSensors({...this.robot,x,y,heading,leftMotor:0,rightMotor:0},this.scene());
    this.mission.invalidate();this.status='idle';this.programControlled=false;this.feedback='Modo calibración: mueve el IROH sobre blanco y negro y observa las lecturas de los sensores.';
    break;
   }
  }
 }
 tick(){
  if(this.status!=='running')return;
  if(this.track.id==='s03'&&this.s03AutoStrike){
   const strike=this.s03AutoStrike;
   const obstacle=this.obstacles.find(item=>item.id===strike.obstacleId);
   const now=this.robot.simTimeMs;
   if(obstacle&&!strike.contacted&&now>=strike.contactAt){
    // Contacto garantizado: la animación no depende de una intersección geométrica
    // demasiado estricta entre el brazo y el centro de la caja.
    obstacle.movable=true;
    const lateral={x:-Math.sin(this.robot.heading)*strike.side,y:Math.cos(this.robot.heading)*strike.side};
    obstacle.vx=lateral.x*32;
    obstacle.vy=lateral.y*32;
    this.struck.add(obstacle.id);
    strike.contacted=true;
    this.emit({type:'OBSTACLE_HIT',obstacleId:obstacle.id,side:strike.side===-1?'left':'right'});
    this.emit({type:'OBSTACLE_MOVED',obstacleId:obstacle.id,side:strike.side===-1?'left':'right'});
   }
   if(obstacle&&strike.contacted&&!strike.released&&now>=strike.releaseAt){
    // Solo después de ver la caja desplazarse dejamos libre el recorrido. Así el
    // while del alumno observa el obstáculo durante el barrido y termina después.
    obstacle.blocking=false;
    strike.released=true;
   }
   if(now>=strike.returnAt&&this.robot.strikeServoPosition!==0)this.setServo(0);
   if(now>=strike.finishAt&&Math.abs(this.robot.strikeServoAngle-90)<1.5)this.s03AutoStrike=null;
  }
  advanceActuators(this.robot,this.obstacles,this.track,PHYSICS_STEP_MS/1000,this.struck,e=>this.emit(e));
  const next=integrate(this.robot,PHYSICS_STEP_MS/1000);
  // The printed plotter has no physical wall: allow the chassis to overhang the
  // paper and only stop once the robot centre itself leaves the sheet.
  const outside=next.x<0||next.y<0||next.x>this.track.physicalWidthCm||next.y>this.track.physicalHeightCm;
  const blockedByObstacle=this.obstacles.some(o=>o.blocking!==false&&intersectsCircle(next,ROBOT.radiusCm,o));
  const blocked=outside||blockedByObstacle;this.ticks++;
  if(blocked){
   this.robot={...this.robot,heading:next.heading,simTimeMs:next.simTimeMs};
   if(!this.touching){
    this.collisions++;
    if(this.programControlled&&blockedByObstacle)this.feedback='Una caja bloquea el avance. Observa qué hace tu programa cuando el sonar la detecta.';
   }
   this.touching=true;
   if(!this.programControlled){this.robot.leftMotor=0;this.robot.rightMotor=0;this.status='idle';this.feedback='El robot tocó un límite o una caja. Prueba retroceder y girar.';}
  }else{this.robot=next;this.touching=false;}
  this.robot=updateSensors(this.robot,this.scene());
  if(this.track.id==='s03'){
   const activeIntersections=this.scenarioIntersections.filter(item=>!this.s03ConsumedIntersections.has(item.id));
   const nearest=activeIntersections.map(item=>({item,distance:Math.hypot(this.robot.x-item.x,this.robot.y-item.y)})).sort((a,b)=>a.distance-b.distance)[0];
   const allBlack=[this.robot.lineLeft,this.robot.lineCenter,this.robot.lineRight].every((value,index)=>value>=this.lineThresholds[index]);
   if(!this.s03IntersectionTurn&&nearest&&nearest.distance<=12&&allBlack)this.s03IntersectionTurn={id:nearest.item.id,heading:this.robot.heading};
   if(this.s03IntersectionTurn){
    const delta=Math.abs(Math.atan2(Math.sin(this.robot.heading-this.s03IntersectionTurn.heading),Math.cos(this.robot.heading-this.s03IntersectionTurn.heading)));
    if(delta>=2.55){
     const intersectionId=this.s03IntersectionTurn.id;
     this.s03ConsumedIntersections.add(intersectionId);
     this.s03IntersectionTurn=null;
     // El motor es la fuente de verdad para una respuesta de 180°. Emitimos un
     // evento único para que la evaluación no dependa de volver a inferir el giro
     // con otra geometría/tolerancia distinta.
     this.emit({type:'INTERSECTION_RESPONDED',intersectionId});
     // La franja sigue dibujada para que el mapa no cambie, pero deja de actuar
     // como una segunda intersección cuando el IROH vuelve por el mismo lugar.
     this.robot=updateSensors(this.robot,this.scene());
    }
   }
  }
  if(this.programControlled)this.mission.observeTick(this.robot);
  const sensedLine=[this.robot.lineLeft,this.robot.lineCenter,this.robot.lineRight].some((value,index)=>value>=this.lineThresholds[index]);
  const lineFront={x:this.robot.x+Math.cos(this.robot.heading)*ROBOT.lineFrontCm,y:this.robot.y+Math.sin(this.robot.heading)*ROBOT.lineFrontCm};
  const intentionalGap=(this.track.id==='s04'||this.track.id==='s05')&&!!this.track.missionZones?.some(zone=>((this.track.id==='s04'&&(zone.id==='gap1'||zone.id==='gap2'))||(this.track.id==='s05'&&zone.id==='gap'))&&lineFront.x>=zone.x&&lineFront.x<=zone.x+zone.width&&lineFront.y>=zone.y&&lineFront.y<=zone.y+zone.height);
  const line=sensedLine||intentionalGap;
  // A one-sensor zig-zag intentionally spends short instants over white. S04
  // also contains two intentional all-white gaps, which are part of the task.
  if(line){
   this.offLineMs=0;
   if(!this.onLine){this.onLine=true;this.emit({type:'LINE_FOUND'});}
  }else if(this.onLine){
   this.offLineMs+=PHYSICS_STEP_MS;
   if(this.offLineMs>=450){this.onLine=false;this.emit({type:'LINE_LOST'});}
  }
  const zone=isInsideFinishZone(this.robot,this.track)?.id??null;
  if(zone&&zone!==this.lastZone)this.emit({type:'FINISH_REACHED',zoneId:zone});this.lastZone=zone;
 }
 snapshot():Snapshot{
  const zone=isInsideFinishZone(this.robot,this.track)?.id??null;
  return {mission:this.mission.evaluate(this.robot),robot:{...this.robot,lcd:[...this.robot.lcd]},status:this.status,feedback:this.feedback,ticks:this.ticks,collisions:this.collisions,obstacles:this.obstacles.map(o=>({...o})),scenarioIntersections:this.scenarioIntersections.map(item=>({...item})),events:this.events.slice(-12).map(e=>e.type==='LCD_UPDATED'?{...e,rows:[...e.rows]}:{...e}),instructions:this.instructions,finish:{zoneId:zone,arrived:!!zone,stopped:!!zone&&this.robot.leftMotor===0&&this.robot.rightMotor===0}};
 }
}

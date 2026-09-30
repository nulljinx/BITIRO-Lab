import type {TrackDefinition,RobotState,Snapshot,Command,Status,DynamicObstacle,SimulationEvent,EventPayload,LineThresholds,Point,ScenarioIntersection} from './types';
import {ROBOT,PHYSICS_STEP_MS} from './config';
import {integrate} from './RobotPhysics';
import {intersectsCircle} from './geometry';
import {updateSensors,sonarHit} from './sensors';
import {advanceActuators} from './actuators';
import {isInsideFinishZone} from './finish';
import {feedbackFor} from './LearningFeedbackEngine';
import {MissionEvaluator} from './MissionEvaluator';
import {S03_FIXED_SCENARIO,s01ObstacleForIR,withScenarioIntersections} from './scenario';
export class SimulationEngine {
 robot!:RobotState;obstacles:DynamicObstacle[]=[];events:SimulationEvent[]=[];
 status:Status='idle';ticks=0;collisions=0;speed=1;instructions=0;programControlled=false;
 feedback='';private sequence=0;private struck=new Set<string>();private touching=false;private onLine=true;private lastZone:string|null=null;private sonarReported=new Set<string>();
 private lineThresholds:LineThresholds=[ROBOT.threshold,ROBOT.threshold,ROBOT.threshold];
 private offLineMs=0;
 private s03ObstaclePoints:Point[]=[];private scenarioIntersections:ScenarioIntersection[]=[];
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
  this.obstacles=this.track.id==='s01'?[]:this.track.id==='s03'&&this.s03ObstaclePoints.length?this.s03ObstaclePoints.map((point,index)=>({id:`s03-obstacle-${index+1}`,x:point.x-3,y:point.y-3,width:6,height:6,movable:true,blocking:true,vx:0,vy:0})):this.track.obstacles.map(o=>({...o,vx:0,vy:0}));
  // The plotter is a sheet on the floor, not a wall. The IROH body may overhang
  // the paper while its centre is still on the usable surface. Clamp the centre
  // to the sheet instead of forcing the complete robot footprint inside it.
  // This is important on S03, whose official line runs close to the lower edge.
  const safeStart={...this.track.start,
   x:Math.max(0,Math.min(this.track.physicalWidthCm,this.track.start.x)),
   y:Math.max(0,Math.min(this.track.physicalHeightCm,this.track.start.y))};
  this.robot=updateSensors({...safeStart,leftMotor:0,rightMotor:0,lineLeft:0,lineCenter:0,lineRight:0,irLeft:false,irRight:false,sonarCm:0,lcd:['                ','                '],lcdBacklight:false,strikeServoPosition:0,strikeServoAngle:90,strikeServoAttached:false,buttonPressed:false,simTimeMs:0},this.scene());
  this.mission.reset();this.status='idle';this.ticks=0;this.collisions=0;this.events=[];this.sequence=0;this.instructions=0;this.programControlled=false;this.struck.clear();this.touching=false;this.lastZone=null;this.onLine=true;this.sonarReported.clear();
  this.offLineMs=0;
  this.feedback='Robot en el inicio. Escribe tu programa y pulsa Ejecutar en simulador.';
 }
 private scene():TrackDefinition{return withScenarioIntersections({...this.track,obstacles:this.obstacles},this.scenarioIntersections);}
 /** Keep the S01 physical scenario tied to the one IR chosen before running. */
 syncS01Scenario(){
  if(this.track.id!=='s01')return;
  const obstacle=s01ObstacleForIR(this.robot.irLeft,this.robot.irRight);
  this.obstacles=obstacle?[{...obstacle,vx:0,vy:0}]:[];
  this.robot=updateSensors(this.robot,this.scene());
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
  if(distance>0&&distance<25){
   const id=sonarHit(this.robot,this.scene()).obstacleId;
   if(id&&!this.sonarReported.has(id)){this.sonarReported.add(id);this.emit({type:'OBSTACLE_DETECTED',distance,obstacleId:id});}
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
   case 'ir':this.robot[command.side==='left'?'irLeft':'irRight']=command.value;if(this.track.id==='s01'&&!this.programControlled)this.syncS01Scenario();break;
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
  if(this.programControlled)this.mission.observeTick(this.robot);
  const line=[this.robot.lineLeft,this.robot.lineCenter,this.robot.lineRight].some((value,index)=>value>=this.lineThresholds[index]);
  // A one-sensor zig-zag intentionally spends short instants over white. Only
  // report a lost line after a sustained all-white reading, otherwise S01
  // teaches the wrong lesson by flagging its normal correction movement.
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

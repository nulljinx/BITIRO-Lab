import type {RobotState,DynamicObstacle,EventPayload,TrackDefinition} from './types';
import {distanceToSegment} from './geometry';
export const STRIKE={pivotCm:6,lengthCm:14,degreesPerSecond:300,impulseCmS:60,drag:3} as const;
export function servoAngle(position:-1|0|1){return position===-1?165:position===1?15:90;}
export function strikeTip(robot:RobotState){const pivot={x:robot.x+Math.cos(robot.heading)*STRIKE.pivotCm,y:robot.y+Math.sin(robot.heading)*STRIKE.pivotCm};const angle=robot.heading+(90-robot.strikeServoAngle)*Math.PI/180;return {pivot,tip:{x:pivot.x+Math.cos(angle)*STRIKE.lengthCm,y:pivot.y+Math.sin(angle)*STRIKE.lengthCm}};}
export function advanceActuators(robot:RobotState,boxes:DynamicObstacle[],track:TrackDefinition,dt:number,struck:Set<string>,emit:(e:EventPayload)=>void){
 const target=servoAngle(robot.strikeServoPosition),diff=target-robot.strikeServoAngle;
 const moving=robot.strikeServoAttached&&Math.abs(diff)>.001;
 if(moving){robot.strikeServoAngle+=Math.sign(diff)*Math.min(Math.abs(diff),STRIKE.degreesPerSecond*dt);
  if(robot.strikeServoPosition!==0){const {pivot,tip}=strikeTip(robot);for(const box of boxes){
   if(!box.movable||struck.has(box.id))continue;
   const center={x:box.x+box.width/2,y:box.y+box.height/2};
   // Deterministic capsule approximation of the swept arm against a box.
   if(distanceToSegment(center,pivot,tip)<=Math.min(box.width,box.height)/2+1){
    const side=robot.strikeServoPosition===-1?'left':'right';const sign=robot.strikeServoPosition;
    box.vx=-Math.sin(robot.heading)*sign*STRIKE.impulseCmS;box.vy=Math.cos(robot.heading)*sign*STRIKE.impulseCmS;struck.add(box.id);
    // In S03, a successful fan strike means the obstacle has been cleared from
    // the route. Keep rendering and animating the box, but do not let the
    // displaced box trap the robot later on the closed circuit.
    if(track.id==='s03')box.blocking=false;
    emit({type:'OBSTACLE_HIT',obstacleId:box.id,side});emit({type:'OBSTACLE_MOVED',obstacleId:box.id,side});
   }
  }}
 }
 for(const box of boxes){
  box.x=Math.max(0,Math.min(track.physicalWidthCm-box.width,box.x+box.vx*dt));box.y=Math.max(0,Math.min(track.physicalHeightCm-box.height,box.y+box.vy*dt));
  box.vx*=Math.exp(-STRIKE.drag*dt);box.vy*=Math.exp(-STRIKE.drag*dt);
  if(Math.abs(box.vx)<.01)box.vx=0;if(Math.abs(box.vy)<.01)box.vy=0;
 }
}

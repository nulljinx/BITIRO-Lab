import { ROBOT } from './config';
import { lineCoverage,rayBox } from './geometry';
import type { RobotState, TrackDefinition, Point } from './types';

export function sensorPosition(robot: RobotState, side: number): Point {
  const c=Math.cos(robot.heading), s=Math.sin(robot.heading);
  return {x:robot.x+c*ROBOT.lineFrontCm-s*side,y:robot.y+s*ROBOT.lineFrontCm+c*side};
}
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
/**
 * Deterministic reflectance variation across the printed surface.
 *
 * Real paper, ink, lighting and sensor height do not produce one exact ADC
 * number everywhere. The simulator keeps that variation spatial (the same
 * point always returns the same reference) instead of adding frame-by-frame
 * random noise, so students can deliberately sample several places and learn
 * why a threshold should separate ranges rather than memorize one magic value.
 */
export function lineSurfaceLevels(point:Point,track:TrackDefinition){
  const nx=point.x/Math.max(1,track.physicalWidthCm),ny=point.y/Math.max(1,track.physicalHeightCm);
  const broad=(Math.sin(nx*Math.PI*2.1)+Math.cos(ny*Math.PI*2.7))/2;
  const local=Math.sin((nx*4.2+ny*3.4)*Math.PI);
  const white=clamp(Math.round(ROBOT.white+broad*12+local*6),12,60);
  const black=clamp(Math.round(ROBOT.black+broad*28-local*14),330,460);
  return {white,black};
}
export type LineSensorIndex=0|1|2;
const LINE_SENSOR_RESPONSE=[
  {whiteOffset:12,blackOffset:-30},
  {whiteOffset:-2,blackOffset:8},
  {whiteOffset:18,blackOffset:28},
] as const;
/**
 * Individual response of each physical line sensor.
 *
 * Even sensors from the same model rarely share the exact same offset/gain.
 * Keeping a stable per-channel response lets students discover that L/C/R can
 * require different thresholds instead of copying one number to all three.
 */
export function lineSensorSurfaceLevels(point:Point,track:TrackDefinition,sensor:LineSensorIndex){
  const base=lineSurfaceLevels(point,track),profile=LINE_SENSOR_RESPONSE[sensor];
  return {
    white:clamp(base.white+profile.whiteOffset,8,96),
    black:clamp(base.black+profile.blackOffset,300,470),
  };
}
export function lineReadingAt(point:Point,track:TrackDefinition,sensor:LineSensorIndex=1){
  const coverage=lineCoverage(point,track.paths),levels=lineSensorSurfaceLevels(point,track,sensor);
  return Math.round(levels.white+(levels.black-levels.white)*coverage);
}

/**
 * The HC-SR04 style sensor does not behave as an infinitely thin laser ray.
 * Sample a modest cone so a box following a curved line can be detected before
 * the chassis reaches it. Keeping the cone deterministic makes repeated tests
 * comparable for students.
 */
const SONAR_BEAM_ANGLES=[-.52,-.39,-.26,-.13,0,.13,.26,.39,.52] as const; // ±30°
export function sonarHit(robot:Pick<RobotState,'x'|'y'|'heading'>,track:TrackDefinition){
  const forward={x:Math.cos(robot.heading),y:Math.sin(robot.heading)};
  const origin={x:robot.x+forward.x*ROBOT.sonarOffsetCm,y:robot.y+forward.y*ROBOT.sonarOffsetCm};
  let best={distance:Infinity,obstacleId:undefined as string|undefined};
  for(const box of track.obstacles){
    if(track.id==='s03'&&box.blocking===false)continue;
    for(const offset of SONAR_BEAM_ANGLES){
      const angle=robot.heading+offset;
      const direction={x:Math.cos(angle),y:Math.sin(angle)};
      const distance=rayBox(origin,direction,box);
      if(distance<best.distance)best={distance,obstacleId:box.id};
    }
  }
  return best;
}
export function updateSensors(robot: RobotState, track: TrackDefinition): RobotState {
  const values=[-ROBOT.lineSpreadCm,0,ROBOT.lineSpreadCm].map((side,index) => lineReadingAt(sensorPosition(robot,side),track,index as LineSensorIndex));
  const {distance}=sonarHit(robot,track);
  // NewPing NO_ECHO=0; library also suppresses readings <=5cm.
  const sonarCm=distance>5 && distance<=ROBOT.sonarMaxCm ? Math.floor(distance) : 0;
  return {...robot,lineLeft:values[0],lineCenter:values[1],lineRight:values[2],sonarCm};
}
export function majorityIR(samples: readonly [boolean,boolean,boolean]): boolean {
  return samples.filter(Boolean).length>=2;
}

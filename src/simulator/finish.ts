import type {Point,TrackDefinition} from './types';

// Track geometry is expressed in decimal centimetres. Values that are
// mathematically identical can differ by a few IEEE-754 ulps (for example
// 20.2 + 10.6 becomes 30.799999999999997 while a path endpoint is 30.8).
// Keep finish-zone edges inclusive with a tiny numerical tolerance rather
// than moving the imported geometry to make a test pass.
const FINISH_EPSILON_CM=1e-9;

export function isInsideFinishZone(robot:Point,track:TrackDefinition){
 return track.finishZones.find(z=>
  robot.x>=z.x-FINISH_EPSILON_CM&&
  robot.x<=z.x+z.width+FINISH_EPSILON_CM&&
  robot.y>=z.y-FINISH_EPSILON_CM&&
  robot.y<=z.y+z.height+FINISH_EPSILON_CM
 )??null;
}

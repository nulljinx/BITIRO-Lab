import type {LinePath,Obstacle,Point,ScenarioIntersection,TrackDefinition} from './types';


/**
 * S01 always shows both practice boxes, one on each destination base. The
 * initial IR does not create or remove them: it only selects which one is the
 * target of the attempt (IZQ -> left base, DER -> right base).
 */
export const S01_BOXES={
 left:{id:'practice-box-left',x:17,y:18,width:8,height:8,movable:true,blocking:true},
 right:{id:'practice-box-right',x:75,y:18,width:8,height:8,movable:true,blocking:true},
} satisfies Record<'left'|'right',Obstacle>;
export const S01_TARGET_BOX_ID={left:S01_BOXES.left.id,right:S01_BOXES.right.id} as const;

export const S03_FIXED_SCENARIO={
 obstacles:[
  // Los tres obstáculos quedan centrados sobre el trazado y repartidos a lo
  // largo del recorrido. El primero queda lejos del inicio para evitar que el
  // sonar lo detecte apenas comienza la simulación.
  {x:82.214,y:160.363},
  {x:13.369,y:153.838},
  {x:11.571,y:49.9},
 ] satisfies Point[],
 intersections:[
  {x:26.1,y:106.0},
  {x:87.9,y:128.9},
  {x:26.9,y:12.3},
 ] satisfies Point[],
};

export function scenarioIntersectionPaths(intersections:readonly ScenarioIntersection[]):LinePath[]{
 return intersections.map((point,index)=>({
  id:`scenario-intersection-${index+1}`,
  // Las intersecciones horizontales deben verse como una franja añadida al mapa,
  // no como un bloque ancho que deforme el trazado original.
  widthCm:2.8,
  lineCap:'square',
  points:[{x:point.x-5.8,y:point.y},{x:point.x+5.8,y:point.y}],
 }));
}
export function withScenarioIntersections(track:TrackDefinition,intersections:readonly ScenarioIntersection[]):TrackDefinition{
 if(!intersections.length)return track;
 return {...track,paths:[...track.paths,...scenarioIntersectionPaths(intersections)]};
}

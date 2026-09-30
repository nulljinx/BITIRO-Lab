import type {LinePath,Obstacle,Point,ScenarioIntersection,TrackDefinition} from './types';


/**
 * S01 uses one movable obstacle at the destination selected by the initial IR.
 * The obstacle sits on the final base so the classroom sequence is preserved:
 * choose a route -> follow the line -> reach the base -> strike the obstacle.
 */
export const S01_TARGET_OBSTACLES={
 left:{id:'practice-box',x:17,y:18,width:8,height:8,movable:true,blocking:true},
 right:{id:'practice-box',x:75,y:18,width:8,height:8,movable:true,blocking:true},
} satisfies Record<'left'|'right',Obstacle>;

export function s01ObstacleForIR(left:boolean,right:boolean):Obstacle|null{
 if(left===right)return null;
 return {...S01_TARGET_OBSTACLES[left?'left':'right']};
}

export const S03_FIXED_SCENARIO={
 obstacles:[
  {x:16.8,y:59.5},
  {x:65.3,y:171.7},
  {x:89.1,y:33.2},
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
  widthCm:3.4,
  lineCap:'square',
  points:[{x:point.x-7,y:point.y},{x:point.x+7,y:point.y}],
 }));
}
export function withScenarioIntersections(track:TrackDefinition,intersections:readonly ScenarioIntersection[]):TrackDefinition{
 if(!intersections.length)return track;
 return {...track,paths:[...track.paths,...scenarioIntersectionPaths(intersections)]};
}

import type {LinePath,Point,ScenarioIntersection,TrackDefinition} from './types';

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

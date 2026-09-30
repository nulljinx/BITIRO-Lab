import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import track from '../../content/tracks/s01.json';

const TEST_OBSTACLE={id:'runtime-box',x:46,y:94,width:8,height:8,movable:true,blocking:true} as const;

export function create(source:string,empty=true,startY=track.start.y){
 const fixture={...track,id:'runtime-fixture',start:{...track.start,y:startY},obstacles:empty?[]:[{...TEST_OBSTACLE}]};
 const engine=new SimulationEngine(fixture),runtime=new ProgramRuntime(engine);
 runtime.run(source);
 return {engine,runtime};
}
export const program=(setup:string,loop='')=>`void setup(){${setup}} void loop(){${loop}}`;

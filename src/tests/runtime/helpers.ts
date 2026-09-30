import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import track from '../../content/tracks/s01.json';
export function create(source:string,empty=true,startY=track.start.y){const engine=new SimulationEngine({...track,start:{...track.start,y:startY},obstacles:empty?[]:track.obstacles}),runtime=new ProgramRuntime(engine);runtime.run(source);return {engine,runtime};}
export const program=(setup:string,loop='')=>`void setup(){${setup}} void loop(){${loop}}`;

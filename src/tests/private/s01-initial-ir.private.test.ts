import {describe,expect,it} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {privateSolution,privateSolutionsAvailable} from '../support/private-solutions';
import track from '../../content/tracks/s01.json';

const complete=(engine:SimulationEngine,runtime:ProgramRuntime)=>{for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);return engine.snapshot().mission;};
const boxes=(e:SimulationEngine)=>e.snapshot().obstacles.map(({id,x,y})=>({id,x,y}));

// Needs the real reference program (outside Git). Skipped without BITIRO_SOLUTIONS_DIR.
describe.skipIf(!privateSolutionsAvailable)('private suite · s01 initial IR',()=>{
  const setup=(left:boolean,right:boolean)=>{
    const engine=new SimulationEngine(track),runtime=new ProgramRuntime(engine);
    runtime.command({type:'ir',side:'left',value:left});
    runtime.command({type:'ir',side:'right',value:right});
    return {engine,runtime};
  };
  it('IR activated DURING the attempt and read by the program fixes the route in that same attempt',()=>{
    const {engine,runtime}=setup(false,false);
    runtime.run(privateSolution('s01'));runtime.step(300);
    runtime.command({type:'ir',side:'right',value:true});
    const mission=complete(engine,runtime);
    expect(runtime.diagnostic).toBeNull();
    expect(mission.status).toBe('completed');expect(mission.checks.every(c=>c.passed)).toBe(true);
  });
  it('stop and a new attempt with the opposite IR evaluates the opposite route',()=>{
    const {engine,runtime}=setup(true,false);
    runtime.run(privateSolution('s01'));runtime.step(300);
    runtime.command({type:'stop'});
    runtime.command({type:'ir',side:'left',value:false});
    runtime.command({type:'ir',side:'right',value:true});
    runtime.run(privateSolution('s01'));
    const mission=complete(engine,runtime);
    expect(mission.status).toBe('completed');expect(mission.checks.every(c=>c.passed)).toBe(true);
  });
  it('reset returns both boxes to their original position after a pass',()=>{
    const {engine,runtime}=setup(true,false);
    const original=boxes(engine);
    runtime.run(privateSolution('s01'));complete(engine,runtime);
    expect(boxes(engine)).not.toEqual(original);
    runtime.command({type:'reset'});
    expect(boxes(engine)).toEqual(original);
  });
});

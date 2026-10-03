import {describe,expect,it} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {trackForSession} from '../../content/tracks';
import {privateSolution,privateSolutionsAvailable} from '../support/private-solutions';

type Signal={left?:boolean;right?:boolean;button?:boolean};
const signalCheck=(e:SimulationEngine)=>e.snapshot().mission.checks.find(c=>c.key==='ir')!;
const complete=(engine:SimulationEngine,runtime:ProgramRuntime)=>{for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);return engine.snapshot().mission;};
function setup({left=false,right=false,button=false}:Signal={}){
  const engine=new SimulationEngine(trackForSession('s02')),runtime=new ProgramRuntime(engine);
  runtime.command({type:'ir',side:'left',value:left});
  runtime.command({type:'ir',side:'right',value:right});
  runtime.command({type:'button',value:button});
  return {engine,runtime};
}

// Needs the real reference program (outside Git). Skipped without BITIRO_SOLUTIONS_DIR.
describe.skipIf(!privateSolutionsAvailable)('private suite · s02 signal',()=>{
  const src=()=>privateSolution('s02');
  it('without a signal the run starts; RIGHT activated and read during the attempt reaches 4/4 (Base 1)',()=>{
    const {engine,runtime}=setup();
    expect(runtime.run(src())).toEqual([]);
    runtime.step(300);expect(engine.status).toBe('running');
    runtime.command({type:'ir',side:'right',value:true});
    const mission=complete(engine,runtime);
    expect(mission.status).toBe('completed');
    expect(mission.checks.every(c=>c.passed)).toBe(true);
    expect(signalCheck(engine).label).toContain('Base 1');
  });
  for(const [label,signal] of [['RIGHT → Base 1',{right:true}],['LEFT → Base 2',{left:true}],['LEFT+RIGHT → Base 3',{left:true,right:true}],['button → Base 3',{button:true}]] as [string,Signal][])
    it(`${label}: 4/4 on the first attempt`,()=>{
      const {engine,runtime}=setup(signal);
      expect(runtime.run(src())).toEqual([]);
      const mission=complete(engine,runtime);
      expect(runtime.diagnostic).toBeNull();
      expect(mission.status).toBe('completed');
      expect(mission.checks).toHaveLength(4);
      expect(mission.checks.every(c=>c.passed)).toBe(true);
    });
  it('the button changed during the run keeps the base already chosen by the program',()=>{
    const {engine,runtime}=setup({button:true});
    runtime.run(src());runtime.step(100);
    runtime.command({type:'button',value:false});runtime.command({type:'ir',side:'left',value:true});
    const mission=complete(engine,runtime);
    expect(mission.status).toBe('completed');
    expect(signalCheck(engine).label).toContain('Base 3');
  });
  it('after stop with a changed signal the next attempt reaches 4/4 without re-run',()=>{
    const {engine,runtime}=setup({right:true});
    runtime.run(src());runtime.step(100);runtime.command({type:'stop'});
    runtime.command({type:'ir',side:'right',value:false});runtime.command({type:'ir',side:'left',value:true});
    runtime.run(src());
    const mission=complete(engine,runtime);
    expect(mission.status).toBe('completed');expect(mission.checks.every(c=>c.passed)).toBe(true);
  });
});

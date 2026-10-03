import {describe,expect,it} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {trackForSession} from '../../content/tracks';
import {deriveMissionView} from '../../features/simulator/mission-state';
import {privateSolution,privateSolutionsAvailable} from '../support/private-solutions';

// Needs the real reference program (outside Git). Skipped without BITIRO_SOLUTIONS_DIR.
describe.skipIf(!privateSolutionsAvailable)('private suite · mission completion (S01)',()=>{
  function completeS01(side:'left'|'right'){
    const engine=new SimulationEngine(trackForSession('s01')),runtime=new ProgramRuntime(engine);
    runtime.command({type:'ir',side:'left',value:side==='left'});
    runtime.command({type:'ir',side:'right',value:side==='right'});
    expect(runtime.run(privateSolution('s01'))).toEqual([]);
    for(let tick=0;tick<12000&&engine.snapshot().mission.status!=='completed';tick++)runtime.step(10);
    expect(engine.snapshot().mission.status).toBe('completed');
    return {engine,runtime};
  }
  it.each(['left','right'] as const)('recognizes S01 %s only after authentic runtime milestones',side=>{
    const {engine,runtime}=completeS01(side);
    const result=engine.snapshot().mission;
    expect(result.kind).toBe('formative_client_simulation');
    expect(result.checks).toHaveLength(4);
    expect(result.checks.every(check=>check.passed)).toBe(true);
    runtime.command({type:'reset'});
    expect(engine.snapshot().mission.status).toBe('in_progress');
    expect(engine.snapshot().mission.checks.every(check=>!check.passed)).toBe(true);
  });
  it('a completed S01 stays 4/4 after stop',()=>{
    const {engine,runtime}=completeS01('left');
    runtime.command({type:'stop'});
    const s=engine.snapshot();
    expect(s.mission.status).toBe('completed');
    expect(deriveMissionView({evidence:s.mission,status:s.status,ticks:s.ticks,previouslyPassed:false})).toMatchObject({phase:'passed',passed:4,total:4});
  });
});

import {describe,expect,it} from 'vitest';
import {privateSolution,privateSolutionsAvailable} from '../support/private-solutions';
import {trackForSession} from '../../content/tracks';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {deriveMissionView} from '../../features/simulator/mission-state';

// Needs the real reference programs (outside Git). Skipped without BITIRO_SOLUTIONS_DIR.
describe.skipIf(!privateSolutionsAvailable)('private suite · mission-terminal',()=>{
type SessionId='s01'|'s02'|'s03'|'s04'|'s05';
// Drives each reference solution the way a student would operate the simulator (stimuli included) until it passes.
function runToCompletion(id:SessionId){
  const engine=new SimulationEngine(trackForSession(id)),runtime=new ProgramRuntime(engine);
  if(id==='s01'||id==='s02')runtime.command({type:'ir',side:'left',value:true});
  expect(runtime.run(privateSolution(id))).toEqual([]);
  // S05 human interaction, driven by the real phase: one DER click (counter 1), an IZQ click to start,
  // then a second IZQ click once the robot has stopped in the junction. Each click is ON then OFF.
  let s05Phase:'count'|'start'|'route'|'authorise'|'done'='count',phaseTick=0,stillTicks=0;
  for(let tick=0;tick<40000&&engine.snapshot().mission.status!=='completed';tick++){
    runtime.step(10);
    if(id!=='s05')continue;
    phaseTick++;
    const robot=engine.robot,inJunction=robot.y<67&&robot.y>50,stopped=robot.leftMotor===0&&robot.rightMotor===0;
    if(s05Phase==='count'){
      if(phaseTick===20)runtime.command({type:'ir',side:'right',value:true});
      if(phaseTick===42){runtime.command({type:'ir',side:'right',value:false});s05Phase='start';phaseTick=0;}
    }else if(s05Phase==='start'){
      if(phaseTick===20)runtime.command({type:'ir',side:'left',value:true});
      if(phaseTick===42){runtime.command({type:'ir',side:'left',value:false});s05Phase='route';phaseTick=0;}
    }else if(s05Phase==='route'){
      stillTicks=inJunction&&stopped?stillTicks+1:0;
      if(stillTicks>35){runtime.command({type:'ir',side:'left',value:true});s05Phase='authorise';phaseTick=0;}
    }else if(s05Phase==='authorise'&&phaseTick===22){runtime.command({type:'ir',side:'left',value:false});s05Phase='done';}
  }
  expect(engine.snapshot().mission.status).toBe('completed');
  return {engine,runtime};
}

describe('mission completion is terminal for the attempt (S01-S05)',()=>{
  for(const id of ['s01','s02','s03','s04','s05'] as const){
    it(`${id}: evidence, counter and badge agree after the pass, after Detener and after the robot keeps moving`,()=>{
      const {engine,runtime}=runToCompletion(id);
      const passed=engine.snapshot().mission;
      expect(passed.checks.length).toBeGreaterThan(0);
      expect(passed.checks.every(check=>check.passed)).toBe(true);
      const frozen=JSON.stringify(passed);
      // The program keeps running a while: later states must not rewrite the result.
      for(let i=0;i<400;i++)runtime.step(10);
      expect(JSON.stringify(engine.snapshot().mission)).toBe(frozen);
      // Detener (worker maps stop-program to stop): the attempt stays passed and coherent.
      runtime.command({type:'stop'});
      const afterStop=engine.snapshot();
      expect(JSON.stringify(afterStop.mission)).toBe(frozen);
      const view=deriveMissionView({evidence:afterStop.mission,status:afterStop.status,ticks:afterStop.ticks,previouslyPassed:false});
      expect(view).toMatchObject({phase:'passed',passed:afterStop.mission.checks.length,total:afterStop.mission.checks.length});
      // Calibration/manual pose invalidates live evaluation but cannot undo a finished attempt.
      runtime.command({type:'pose',x:20,y:20,heading:0});
      expect(JSON.stringify(engine.snapshot().mission)).toBe(frozen);
    });
    it(`${id}: Restablecer starts a new attempt and the next run can pass again`,()=>{
      const {engine,runtime}=runToCompletion(id);
      runtime.command({type:'reset'});
      const reset=engine.snapshot();
      expect(reset.mission.status).toBe('in_progress');
      expect(reset.mission.checks.every(check=>!check.passed)).toBe(true);
      expect(deriveMissionView({evidence:reset.mission,status:reset.status,ticks:reset.ticks,previouslyPassed:true})).toMatchObject({phase:'ready',passed:0,badge:'Reiniciada · nuevo intento'});
    });
  }
  it('a re-run after a pass is a fresh attempt: it starts unpassed and can be completed independently',()=>{
    const {engine,runtime}=runToCompletion('s03');
    expect(runtime.run(privateSolution('s03'))).toEqual([]);
    expect(engine.snapshot().mission.status).toBe('in_progress');
    expect(engine.snapshot().mission.checks.every(check=>!check.passed)).toBe(true);
    for(let tick=0;tick<12000&&engine.snapshot().mission.status!=='completed';tick++)runtime.step(10);
    expect(engine.snapshot().mission.status).toBe('completed');
  });
});

});

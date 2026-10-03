import {describe,expect,it} from 'vitest';
import {mentorSolutions} from '../content/mentor-solutions';
import {trackForSession} from '../content/tracks';
import {SimulationEngine} from '../simulator/SimulationEngine';
import {ProgramRuntime} from '../simulator/runtime/ProgramRuntime';
import {deriveMissionView} from '../features/simulator/mission-state';

const passedKeys=(engine:SimulationEngine)=>engine.snapshot().mission.checks.filter(check=>check.passed).map(check=>check.key);
const view=(engine:SimulationEngine)=>{const s=engine.snapshot();return deriveMissionView({evidence:s.mission,status:s.status,ticks:s.ticks,previouslyPassed:false});};

// S01 with the left IR active, a running attempt where only "decision" has been earned.
function partialS01(){
  const engine=new SimulationEngine(trackForSession('s01')),runtime=new ProgramRuntime(engine);
  runtime.command({type:'ir',side:'left',value:true});
  expect(runtime.run(mentorSolutions.s01.source)).toEqual([]);
  engine.emit({type:'IR_READ',side:'left',active:true});
  engine.emit({type:'LCD_UPDATED',rows:['IR izquierdo','']} as never);
  return {engine,runtime};
}

describe('partial attempts survive a manual stop',()=>{
  it('A: objectives light up while the attempt runs (0/4 -> 1/4)',()=>{
    const engine=new SimulationEngine(trackForSession('s01')),runtime=new ProgramRuntime(engine);
    runtime.command({type:'ir',side:'left',value:true});
    runtime.run(mentorSolutions.s01.source);
    expect(passedKeys(engine)).toEqual([]);
    engine.emit({type:'IR_READ',side:'left',active:true});
    engine.emit({type:'LCD_UPDATED',rows:['IR izquierdo','']} as never);
    expect(passedKeys(engine)).toEqual(['decision']);
    expect(view(engine)).toMatchObject({phase:'running',passed:1,total:4});
  });
  it('B: stop keeps 1/4 (not 0/4), still in_progress and "Intento detenido"',()=>{
    const {engine,runtime}=partialS01();
    runtime.step(50);
    runtime.command({type:'stop'});
    expect(passedKeys(engine)).toEqual(['decision']);
    expect(engine.snapshot().mission.status).toBe('in_progress');
    expect(view(engine)).toMatchObject({phase:'stopped',passed:1,total:4,badge:'Intento detenido'});
  });
  it('C: after stop, IR / button / sensor / obstacle events cannot change the frozen evidence',()=>{
    const {engine,runtime}=partialS01();
    runtime.command({type:'stop'});
    const frozen=JSON.stringify(engine.snapshot().mission);
    runtime.command({type:'ir',side:'right',value:true});runtime.command({type:'ir',side:'left',value:false});runtime.command({type:'button',value:true});
    engine.emit({type:'LINE_SENSOR_READ',side:'center'});
    engine.emit({type:'OBSTACLE_MOVED',side:'right'} as never);
    engine.mission.observeTick({...engine.robot,x:engine.robot.x+60,simTimeMs:engine.robot.simTimeMs+500});
    expect(JSON.stringify(engine.snapshot().mission)).toBe(frozen);
  });
  it('D: Restablecer and a new run both go back to 0/4',()=>{
    const {engine,runtime}=partialS01();
    runtime.command({type:'stop'});
    runtime.command({type:'reset'});
    expect(passedKeys(engine)).toEqual([]);
    const second=partialS01();
    second.runtime.command({type:'stop'});
    expect(passedKeys(second.engine)).toEqual(['decision']);
    second.runtime.run(mentorSolutions.s01.source);
    expect(passedKeys(second.engine)).toEqual([]);
  });
  it('E: a completed S01 stays 4/4 after stop',()=>{
    const engine=new SimulationEngine(trackForSession('s01')),runtime=new ProgramRuntime(engine);
    runtime.command({type:'ir',side:'left',value:true});runtime.command({type:'ir',side:'right',value:false});
    runtime.run(mentorSolutions.s01.source);
    for(let tick=0;tick<12000&&engine.snapshot().mission.status!=='completed';tick++)runtime.step(10);
    runtime.command({type:'stop'});
    expect(engine.snapshot().mission.status).toBe('completed');
    expect(view(engine)).toMatchObject({phase:'passed',passed:4,total:4});
  });
  it('F: pose / calibration / motor test during an attempt invalidate it, and a stopped partial too',()=>{
    for(const manual of [{type:'pose',x:20,y:20,heading:0},{type:'motors',left:5,right:5}] as const){
      const during=partialS01();
      expect(passedKeys(during.engine)).toEqual(['decision']);
      during.runtime.command(manual);
      expect(passedKeys(during.engine)).toEqual([]);
      const afterStop=partialS01();
      afterStop.runtime.command({type:'stop'});
      afterStop.runtime.command(manual);
      expect(passedKeys(afterStop.engine)).toEqual([]);
    }
  });
  it('a stopped partial attempt is never reported as completed',()=>{
    const {engine,runtime}=partialS01();
    runtime.command({type:'stop'});
    expect(engine.snapshot().mission.status).not.toBe('completed');
  });
});

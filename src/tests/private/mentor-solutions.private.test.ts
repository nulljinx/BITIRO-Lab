import {describe,expect,it} from 'vitest';
import {trackForSession} from '../../content/tracks';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {privateSolution,privateSolutionsAvailable} from '../support/private-solutions';

type SessionId='s01'|'s02'|'s03'|'s04'|'s05';
const ids:SessionId[]=['s01','s02','s03','s04','s05'];

// Needs the real reference programs (outside Git). Skipped without BITIRO_SOLUTIONS_DIR.
// Only behaviour is asserted: no text of any solution is encoded in this file.
describe.skipIf(!privateSolutionsAvailable)('private suite · mentor-solutions',()=>{
  for(const id of ids)it(`${id} is accepted by the educational runtime`,()=>{
    const runtime=new ProgramRuntime(new SimulationEngine(trackForSession(id)));
    expect(runtime.review(privateSolution(id))).toEqual([]);
  });

  it('S03 detects, counts and waits for all three temporary obstacles',()=>{
    const engine=new SimulationEngine(trackForSession('s03'));
    const emitted:import('../../simulator/types').EventPayload[]=[];
    const emit=engine.emit.bind(engine);
    engine.emit=event=>{emitted.push(event);emit(event);};
    const runtime=new ProgramRuntime(engine);
    expect(runtime.run(privateSolution('s03'))).toEqual([]);
    for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
    const result=engine.snapshot();
    expect(result.mission.status).toBe('completed');
    expect(result.mission.progress).toMatchObject({obstaclesDetected:3,lcdValue:3,intersectionsResponded:3,duplicateObstacleRead:false});
    expect(emitted.filter(event=>event.type==='OBSTACLE_HIT')).toHaveLength(3);
    expect(emitted.filter(event=>event.type==='OBSTACLE_MOVED')).toHaveLength(3);
    expect(emitted.filter(event=>event.type==='INTERSECTION_RESPONDED')).toHaveLength(3);
  });

  for(const side of ['left','right'] as const)it(`S01 completes the ${side} route and all four mission checks`,()=>{
    const engine=new SimulationEngine(trackForSession('s01')),runtime=new ProgramRuntime(engine);
    runtime.command({type:'ir',side:'left',value:side==='left'});
    runtime.command({type:'ir',side:'right',value:side==='right'});
    expect(runtime.run(privateSolution('s01'))).toEqual([]);
    for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
    expect(runtime.diagnostic).toBeNull();
    const evidence=engine.snapshot().mission;
    expect(evidence.status).toBe('completed');
    expect(evidence.checks.every(check=>check.passed)).toBe(true);
    expect(engine.events.filter(event=>event.type==='LINE_LOST')).toHaveLength(0);
  });

  for(const scenario of [{label:'Base 1',left:false,right:true},{label:'Base 2',left:true,right:false},{label:'Base 3',left:true,right:true}] as const)
    it(`S02 completes ${scenario.label}`,()=>{
      const engine=new SimulationEngine(trackForSession('s02')),runtime=new ProgramRuntime(engine);
      runtime.command({type:'ir',side:'left',value:scenario.left});
      runtime.command({type:'ir',side:'right',value:scenario.right});
      expect(runtime.run(privateSolution('s02'))).toEqual([]);
      for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
      expect(runtime.diagnostic).toBeNull();
      const evidence=engine.snapshot().mission;
      expect(evidence.status).toBe('completed');
      expect(evidence.checks.every(check=>check.passed)).toBe(true);
      expect(engine.events.filter(event=>event.type==='LINE_LOST')).toHaveLength(0);
    });

  it('S04 completes the official route',()=>{
    const engine=new SimulationEngine(trackForSession('s04')),runtime=new ProgramRuntime(engine);
    expect(runtime.run(privateSolution('s04'))).toEqual([]);
    for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
    expect(runtime.diagnostic).toBeNull();
    const evidence=engine.snapshot().mission;
    expect(evidence.status).toBe('completed');
    expect(evidence.checks.every(check=>check.passed)).toBe(true);
  });
});

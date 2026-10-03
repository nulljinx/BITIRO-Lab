import {describe,expect,it} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {trackForSession} from '../../content/tracks';
import {MINIMAL_ADVANCE} from '../support/minimal-programs';

describe('robot geometry',()=>{
  it('keeps every configured robot centre on the plotter while allowing chassis overhang',()=>{
    for(const sessionId of ['s01','s02','s03','s04','s05'] as const){
      const track=trackForSession(sessionId),engine=new SimulationEngine(track);
      expect(engine.robot.x).toBeGreaterThanOrEqual(0);
      expect(engine.robot.y).toBeGreaterThanOrEqual(0);
      expect(engine.robot.x).toBeLessThanOrEqual(track.physicalWidthCm);
      expect(engine.robot.y).toBeLessThanOrEqual(track.physicalHeightCm);
    }
  });
});

// A one-primitive program: it proves the runtime moves the robot, never that a mission is solved.
describe('minimal program on every mission track',()=>{
  for(const id of ['s01','s02','s03','s04','s05'] as const)
    it(`${id}: avanzar(50) runs freely, moves the robot and completes no objective`,()=>{
      const engine=new SimulationEngine(trackForSession(id)),runtime=new ProgramRuntime(engine);
      const start={x:engine.robot.x,y:engine.robot.y};
      expect(runtime.run(MINIMAL_ADVANCE)).toEqual([]);
      expect(engine.status).toBe('running');
      expect(engine.programControlled).toBe(true);
      runtime.step(300);
      expect(Math.hypot(engine.robot.x-start.x,engine.robot.y-start.y)).toBeGreaterThan(1);
      expect(engine.snapshot().mission.checks.every(check=>!check.passed)).toBe(true);
    });
});

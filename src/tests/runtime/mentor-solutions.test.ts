import {describe,expect,it} from 'vitest';
import {mentorSolutions} from '../../content/mentor-solutions';
import {trackForSession} from '../../content/tracks';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';

describe('mentor reference solutions',()=>{
  for(const sessionId of ['s01','s02','s03'] as const){
    it(`${sessionId} is accepted by the educational runtime`,()=>{
      const engine=new SimulationEngine(trackForSession(sessionId));
      const runtime=new ProgramRuntime(engine);
      expect(runtime.review(mentorSolutions[sessionId].source)).toEqual([]);
    });
  }

  it('keeps every configured robot centre on the plotter while allowing chassis overhang',()=>{
    for(const sessionId of ['s01','s02','s03'] as const){
      const track=trackForSession(sessionId),engine=new SimulationEngine(track);
      expect(engine.robot.x).toBeGreaterThanOrEqual(0);
      expect(engine.robot.y).toBeGreaterThanOrEqual(0);
      expect(engine.robot.x).toBeLessThanOrEqual(track.physicalWidthCm);
      expect(engine.robot.y).toBeLessThanOrEqual(track.physicalHeightCm);
    }
  });

  it('S03 can physically advance after loading the mentor solution',()=>{
    const engine=new SimulationEngine(trackForSession('s03'));
    const runtime=new ProgramRuntime(engine);
    const start={x:engine.robot.x,y:engine.robot.y};
    expect(runtime.run(mentorSolutions.s03.source)).toEqual([]);
    for(let i=0;i<600;i++)runtime.step(10);
    expect(Math.hypot(engine.robot.x-start.x,engine.robot.y-start.y)).toBeGreaterThan(20);
    expect(engine.collisions).toBe(0);
  });
});

it('S03 mentor solution detects, counts and clears all three fixed obstacles',()=>{
  const engine=new SimulationEngine(trackForSession('s03'));
  const runtime=new ProgramRuntime(engine);
  const before=engine.obstacles.map(item=>({x:item.x,y:item.y}));
  expect(engine.obstacles.every(item=>item.movable&&item.blocking)).toBe(true);
  expect(runtime.run(mentorSolutions.s03.source)).toEqual([]);
  for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
  const result=engine.snapshot();
  expect(result.mission.status).toBe('completed');
  expect(result.mission.progress).toMatchObject({obstaclesDetected:3,lcdValue:3,intersectionsResponded:3,duplicateObstacleRead:false});
  expect(engine.obstacles.filter((item,index)=>Math.hypot(item.x-before[index].x,item.y-before[index].y)>5)).toHaveLength(3);
  expect(engine.obstacles.every(item=>item.blocking===false)).toBe(true);
});

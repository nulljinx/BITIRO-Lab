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


for(const side of ['left','right'] as const)it(`S01 mentor solution completes the ${side} route and all four mission checks`,()=>{
  const engine=new SimulationEngine(trackForSession('s01'));
  const runtime=new ProgramRuntime(engine);
  runtime.command({type:'ir',side:'left',value:side==='left'});
  runtime.command({type:'ir',side:'right',value:side==='right'});
  expect(engine.obstacles).toHaveLength(1);
  expect(engine.obstacles[0].x).toBe(side==='left'?17:75);
  expect(runtime.run(mentorSolutions.s01.source)).toEqual([]);
  for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
  expect(runtime.diagnostic).toBeNull();
  const evidence=engine.snapshot().mission;
  expect(evidence.status).toBe('completed');
  expect(evidence.checks).toHaveLength(4);
  expect(evidence.checks.every(check=>check.passed)).toBe(true);
  expect(engine.events.some(event=>event.type==='OBSTACLE_MOVED'&&event.side===(side==='left'?'right':'left'))).toBe(true);
  expect(engine.events.filter(event=>event.type==='LINE_LOST')).toHaveLength(0);
  expect(evidence.elapsedMs).toBeLessThan(60000);
  runtime.step(1600);
  expect(engine.robot.leftMotor).toBe(0);
  expect(engine.robot.rightMotor).toBe(0);
  expect(engine.robot.strikeServoPosition).toBe(0);
});

it('S01 mentor solution refuses an invalid initial IR scenario instead of choosing a route silently',()=>{
  const engine=new SimulationEngine(trackForSession('s01'));
  const runtime=new ProgramRuntime(engine);
  expect(runtime.run(mentorSolutions.s01.source)).toEqual([]);
  for(let i=0;i<50;i++)runtime.step(10);
  expect(runtime.diagnostic).toBeNull();
  expect(engine.robot.leftMotor).toBe(0);
  expect(engine.robot.rightMotor).toBe(0);
  expect(engine.robot.lcd[0]).toContain('ELIGE UN IR');
  expect(engine.snapshot().mission.status).toBe('in_progress');
});

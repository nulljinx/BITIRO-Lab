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

it('S03 mentor reference stays within the classroom progression for counters and while',()=>{
  const source=mentorSolutions.s03.source;
  expect(source).toContain('int sensorI;');
  expect(source).toContain('int sensorC;');
  expect(source).toContain('int sensorD;');
  expect(source).toContain('int contadorObstaculos = 0;');
  expect(source).toContain('contadorObstaculos++;');
  expect(source).toContain('while (distancia > 5 && distancia < 12)');
  expect(source).not.toContain('const int UMBRAL');
  expect(source).not.toContain('ultimoGiro');
});

it('S03 mentor solution detects, counts and waits for all three temporary obstacles',()=>{
  const engine=new SimulationEngine(trackForSession('s03'));
  const runtime=new ProgramRuntime(engine);
  expect(engine.obstacles.every(item=>item.blocking)).toBe(true);
  expect(runtime.run(mentorSolutions.s03.source)).toEqual([]);
  for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
  const result=engine.snapshot();
  expect(result.mission.status).toBe('completed');
  expect(result.mission.progress).toMatchObject({obstaclesDetected:3,lcdValue:3,intersectionsResponded:3,duplicateObstacleRead:false});
  expect(engine.events.filter(event=>event.type==='OBSTACLE_HIT')).toHaveLength(3);
  expect(engine.events.filter(event=>event.type==='OBSTACLE_MOVED')).toHaveLength(3);
  expect(engine.obstacles.every(item=>item.blocking===false)).toBe(true);
  expect(engine.obstacles.every(item=>item.movable)).toBe(true);
  expect(mentorSolutions.s03.source).not.toContain('inicializarGolpe');
  expect(mentorSolutions.s03.source).not.toContain('moverServoGolpe');
  expect(mentorSolutions.s03.source).toContain('escribirPantalla(6, 0, distancia)');
});


it('S01 and S02 mentor references only initialize variables that need an initial state',()=>{
  const s01=mentorSolutions.s01.source;
  expect(s01).toContain('int irIzq;');
  expect(s01).toContain('int irDer;');
  expect(s01).toContain('int sensorCentro;');
  expect(s01).toContain('int distancia;');
  expect(s01).toContain('int lado = 0;');
  expect(s01).toContain('int flag = 0;');
  expect(s01).toContain('int terminado = 0;');

  const s02=mentorSolutions.s02.source;
  expect(s02).toContain('int sensorI;');
  expect(s02).toContain('int sensorC;');
  expect(s02).toContain('int sensorD;');
  expect(s02).toContain('int irIzq;');
  expect(s02).toContain('int irDer;');
  expect(s02).toContain('int boton;');
  expect(s02).toContain('int destino = 0;');
  expect(s02).toContain('int estado = 0;');
  expect(s02).toContain('int cruceSuperado = 0;');
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


for(const scenario of [
  {label:'Base 1',left:false,right:true},
  {label:'Base 2',left:true,right:false},
  {label:'Base 3',left:true,right:true},
] as const)it(`S02 mentor solution completes ${scenario.label} with the class-aligned three-sensor strategy`,()=>{
  const engine=new SimulationEngine(trackForSession('s02'));
  const runtime=new ProgramRuntime(engine);
  runtime.command({type:'ir',side:'left',value:scenario.left});
  runtime.command({type:'ir',side:'right',value:scenario.right});
  expect(runtime.run(mentorSolutions.s02.source)).toEqual([]);
  for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
  expect(runtime.diagnostic).toBeNull();
  const evidence=engine.snapshot().mission;
  expect(evidence.status).toBe('completed');
  expect(evidence.checks).toHaveLength(4);
  expect(evidence.checks.every(check=>check.passed)).toBe(true);
  expect(engine.events.filter(event=>event.type==='LINE_LOST')).toHaveLength(0);
  expect(evidence.elapsedMs).toBeLessThan(60000);
  expect(engine.robot.leftMotor).toBe(0);
  expect(engine.robot.rightMotor).toBe(0);
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

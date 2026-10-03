import {describe,expect,it} from 'vitest';
import {mentorSolutions} from '../../content/mentor-solutions';
import {trackForSession} from '../../content/tracks';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';

describe('mentor reference solutions',()=>{
  for(const sessionId of ['s01','s02','s03','s04','s05'] as const){
    it(`${sessionId} is accepted by the educational runtime`,()=>{
      const engine=new SimulationEngine(trackForSession(sessionId));
      const runtime=new ProgramRuntime(engine);
      expect(runtime.review(mentorSolutions[sessionId].source)).toEqual([]);
    });
  }

  it('keeps every configured robot centre on the plotter while allowing chassis overhang',()=>{
    for(const sessionId of ['s01','s02','s03','s04','s05'] as const){
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
  const emitted:import('../../simulator/types').EventPayload[]=[];
  const emit=engine.emit.bind(engine);
  engine.emit=event=>{emitted.push(event);emit(event);};
  const runtime=new ProgramRuntime(engine);
  expect(engine.obstacles.every(item=>item.blocking)).toBe(true);
  expect(runtime.run(mentorSolutions.s03.source)).toEqual([]);
  for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
  const result=engine.snapshot();
  expect(result.mission.status).toBe('completed');
  expect(result.mission.progress).toMatchObject({obstaclesDetected:3,lcdValue:3,intersectionsResponded:3,duplicateObstacleRead:false});
  expect(emitted.filter(event=>event.type==='OBSTACLE_HIT')).toHaveLength(3);
  expect(emitted.filter(event=>event.type==='OBSTACLE_MOVED')).toHaveLength(3);
  expect(emitted.filter(event=>event.type==='INTERSECTION_RESPONDED')).toHaveLength(3);
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

it('S01 refuses to start without exactly one initial IR instead of choosing a route silently',()=>{
  const engine=new SimulationEngine(trackForSession('s01'));
  const runtime=new ProgramRuntime(engine);
  expect(runtime.run(mentorSolutions.s01.source)).toEqual([]);
  expect(runtime.blockedReason).not.toBeNull();
  expect(engine.status).toBe('idle');
  expect(engine.programControlled).toBe(false);
});

it('S04 mentor solution uses functions, detects the gap case and completes the official route',()=>{
  const source=mentorSolutions.s04.source;
  expect(source).toContain('void leerSensores()');
  expect(source).toContain('void avanzarDerecho(int izquierda, int derecha)');
  expect(source).toContain('void seguirLinea()');
  expect(source).toContain('while (!(sensorI >= umbralI &&');
  expect(source).toContain('sensorI < umbralI &&');
  const engine=new SimulationEngine(trackForSession('s04'));
  const runtime=new ProgramRuntime(engine);
  expect(runtime.run(source)).toEqual([]);
  for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
  expect(runtime.diagnostic).toBeNull();
  const evidence=engine.snapshot().mission;
  expect(evidence.status).toBe('completed');
  expect(evidence.checks).toHaveLength(4);
  expect(evidence.checks.every(check=>check.passed)).toBe(true);
  expect(engine.events.filter(event=>event.type==='LINE_LOST')).toHaveLength(0);
});


for(const scenario of [
  {count:1,label:'Base 1'},
  {count:2,label:'Base 2'},
  {count:3,label:'Base 3'},
  {count:4,label:'Base 3 (>3)'},
] as const)it(`S05 mentor solution completes ${scenario.label} after ${scenario.count} right-IR activations`,()=>{
  const engine=new SimulationEngine(trackForSession('s05'));
  const runtime=new ProgramRuntime(engine);
  const source=mentorSolutions.s05.source;
  expect(runtime.run(source)).toEqual([]);
  const step=(count:number)=>{for(let i=0;i<count;i++)runtime.step(10);};
  const pulse=(side:'left'|'right')=>{runtime.command({type:'ir',side,value:true});step(22);runtime.command({type:'ir',side,value:false});step(22);};
  step(20);
  for(let i=0;i<scenario.count;i++)pulse('right');
  pulse('left');
  let authorized=false,stoppedTicks=0;
  for(let i=0;i<18000&&engine.snapshot().mission.status!=='completed';i++){
    runtime.step(10);
    const robot=engine.robot;
    if(!authorized&&robot.y<67&&robot.y>50&&robot.leftMotor===0&&robot.rightMotor===0){
      stoppedTicks++;
      if(stoppedTicks>35){pulse('left');authorized=true;}
    }else if(!authorized)stoppedTicks=0;
  }
  expect(runtime.diagnostic).toBeNull();
  const evidence=engine.snapshot().mission;
  expect(evidence.status).toBe('completed');
  expect(evidence.checks).toHaveLength(4);
  expect(evidence.checks.every(check=>check.passed)).toBe(true);
});

it('S05 mentor solution keeps setup for initialization and uses while as antirrebote',()=>{
  const source=mentorSolutions.s05.source;
  expect(source).toContain('int sensorI;');
  expect(source).toContain('int sensorC;');
  expect(source).toContain('int sensorD;');
  expect(source).toContain('int contador = 0;');
  expect(source).toContain('while (irDer == 1)');
  expect(source).toContain('contador++;');
  expect(source).toContain('void leerSensores()');
  expect(source).toContain('void seguirLinea()');
});

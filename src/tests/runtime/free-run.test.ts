import {describe,it,expect} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {trackForSession} from '../../content/tracks';

// "Probar código" runs any valid program. Objectives only observe what happened.
const H='#include <KnightRoboticsLibs_Iroh.h>\n';
const forward=`${H}void setup(){inicializarMovimiento();}\nvoid loop(){avanzar(50);}`;
const turn=`${H}void setup(){inicializarMovimiento();}\nvoid loop(){girarDerecha(20);}`;
const idle=`${H}void setup(){inicializarMovimiento();}\nvoid loop(){pausa(100);}`;
const open=(id:string)=>{const engine=new SimulationEngine(trackForSession(id)),runtime=new ProgramRuntime(engine);return {engine,runtime};};

describe('el código libre se ejecuta en S01–S05 sin señales ni objetivos',()=>{
 for(const id of ['s01','s02','s03','s04','s05']){
  it(`${id}: avanzar(50) inicia, se mueve y los objetivos quedan sin cumplir`,()=>{
   const {engine,runtime}=open(id);
   const start={x:engine.robot.x,y:engine.robot.y};
   expect(runtime.run(forward)).toEqual([]);
   expect(runtime.diagnostic).toBeNull();
   expect(engine.status).toBe('running');
   runtime.step(300);
   expect(Math.hypot(engine.robot.x-start.x,engine.robot.y-start.y)).toBeGreaterThan(1);
   const mission=engine.snapshot().mission;
   expect(mission.status).toBe('in_progress');
   expect(mission.checks.every(c=>!c.passed)).toBe(true);
  });
 }
 it('s01: girarDerecha(20) cambia el heading aunque no cumpla objetivos',()=>{
  const {engine,runtime}=open('s01');
  const heading=engine.robot.heading;
  expect(runtime.run(turn)).toEqual([]);
  runtime.step(300);
  expect(engine.status).toBe('running');
  expect(engine.robot.heading).not.toBeCloseTo(heading,2);
  expect(engine.snapshot().mission.checks.every(c=>!c.passed)).toBe(true);
 });
 for(const id of ['s01','s02']){
  it(`${id}: un programa sin sensores puede terminar con 0/4 sin ser bloqueado`,()=>{
   const {engine,runtime}=open(id);
   expect(runtime.run(`${H}void setup(){inicializarMovimiento();}\nvoid loop(){finPrograma();}`)).toEqual([]);
   runtime.step(500);
   expect(engine.status).toBe('finished');
   const mission=engine.snapshot().mission;
   expect(mission.status).toBe('in_progress');
   expect(mission.checks.some(c=>c.passed)).toBe(false);
  });
  it(`${id}: IR y pulsador cambian en running y el motor no los ignora`,()=>{
   const {engine,runtime}=open(id);
   expect(runtime.run(idle)).toEqual([]);
   runtime.step(100);
   runtime.command({type:'ir',side:'left',value:true});
   runtime.command({type:'ir',side:'right',value:true});
   runtime.command({type:'button',value:true});
   expect(engine.robot.irLeft).toBe(true);expect(engine.robot.irRight).toBe(true);expect(engine.robot.buttonPressed).toBe(true);
   runtime.command({type:'ir',side:'left',value:false});
   runtime.command({type:'button',value:false});
   expect(engine.robot.irLeft).toBe(false);expect(engine.robot.buttonPressed).toBe(false);
   expect(engine.status).toBe('running');
  });
 }
});

import {describe,it,expect} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {mentorSolutions} from '../../content/mentor-solutions';
import {trackForSession} from '../../content/tracks';

const src=mentorSolutions.s02.source;
const MESSAGE='Selecciona una señal inicial para S02: IZQ, DER, ambos IR o el pulsador.';
type Signal={left?:boolean;right?:boolean;button?:boolean};
function setup(signal:Signal={}){
 const engine=new SimulationEngine(trackForSession('s02')),runtime=new ProgramRuntime(engine);
 apply(runtime,signal);
 return {engine,runtime};
}
function apply(runtime:ProgramRuntime,{left=false,right=false,button=false}:Signal){
 runtime.command({type:'ir',side:'left',value:left});
 runtime.command({type:'ir',side:'right',value:right});
 runtime.command({type:'button',value:button});
}
const initial=(e:SimulationEngine)=>{const m=e.mission as unknown as {initialIR:{left:boolean;right:boolean}|null;initialButton:boolean};return {ir:m.initialIR,button:m.initialButton};};
function complete(engine:SimulationEngine,runtime:ProgramRuntime){
 for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
 return engine.snapshot().mission;
}

describe('S02 exige una señal inicial explícita',()=>{
 it('E: sin señal el run se bloquea y no cambia el estado',()=>{
  const {engine,runtime}=setup();
  expect(runtime.run(src)).toEqual([]);
  expect(runtime.blockedReason).toBe(MESSAGE);
  expect(engine.status).toBe('idle');expect(engine.programControlled).toBe(false);
  expect(initial(engine).ir).toBeNull();
 });
 it('regresión: sin señal no inicia; tras activar DER inicia y llega a 4/4 en el primer intento válido',()=>{
  const {engine,runtime}=setup();
  runtime.run(src);expect(engine.status).toBe('idle');
  runtime.command({type:'ir',side:'right',value:true});
  expect(runtime.run(src)).toEqual([]);
  expect(runtime.blockedReason).toBeNull();
  expect(engine.status).toBe('running');
  expect(initial(engine).ir).toEqual({left:false,right:true});
  const mission=complete(engine,runtime);
  expect(mission.status).toBe('completed');
  expect(mission.checks.every(c=>c.passed)).toBe(true);
 });
 for(const [label,signal] of [['A: DER → Base 1',{right:true}],['B: IZQ → Base 2',{left:true}],['C: IZQ+DER → Base 3',{left:true,right:true}],['D: pulsador → Base 3',{button:true}]] as [string,Signal][])
  it(`${label}: 4/4 en el primer intento`,()=>{
   const {engine,runtime}=setup(signal);
   expect(runtime.run(src)).toEqual([]);
   expect(runtime.blockedReason).toBeNull();
   const mission=complete(engine,runtime);
   expect(runtime.diagnostic).toBeNull();
   expect(mission.status).toBe('completed');
   expect(mission.checks).toHaveLength(4);
   expect(mission.checks.every(c=>c.passed)).toBe(true);
  });
});

describe('S02 congela la señal inicial durante el intento',()=>{
 it('F: cambiar IR en running o paused no altera estado inicial',()=>{
  const {engine,runtime}=setup({right:true});
  runtime.run(src);runtime.step(100);
  const before=initial(engine);
  runtime.command({type:'ir',side:'left',value:true});runtime.command({type:'ir',side:'right',value:false});
  expect(engine.robot.irLeft).toBe(false);expect(engine.robot.irRight).toBe(true);
  expect(initial(engine)).toEqual(before);
  expect(engine.snapshot().locks.ir).toBe(true);
  runtime.command({type:'pause'});
  runtime.command({type:'ir',side:'left',value:true});
  expect(engine.robot.irLeft).toBe(false);
  expect(engine.snapshot().locks.ir).toBe(true);
 });
 it('G: cambiar el pulsador inicial en running no altera estado inicial',()=>{
  const {engine,runtime}=setup({button:true});
  runtime.run(src);runtime.step(100);
  runtime.command({type:'button',value:false});runtime.command({type:'ir',side:'left',value:true});
  expect(engine.robot.buttonPressed).toBe(true);expect(engine.robot.irLeft).toBe(false);
  expect(initial(engine)).toEqual({ir:{left:false,right:false},button:true});
  expect(engine.snapshot().locks).toEqual({ir:true,button:true});
 });
 it('el pulsador sigue libre si no era parte de la señal inicial',()=>{
  const {engine,runtime}=setup({left:true});
  runtime.run(src);runtime.step(100);
  expect(engine.snapshot().locks).toEqual({ir:true,button:false});
  runtime.command({type:'button',value:true});
  expect(engine.robot.buttonPressed).toBe(true);
 });
 it('H: stop y reset desbloquean para preparar un nuevo intento',()=>{
  const {engine,runtime}=setup({right:true});
  runtime.run(src);runtime.step(100);
  runtime.command({type:'stop'});
  expect(engine.snapshot().locks).toEqual({ir:false,button:false});
  runtime.command({type:'ir',side:'right',value:false});runtime.command({type:'ir',side:'left',value:true});
  expect(engine.robot.irLeft).toBe(true);expect(engine.robot.irRight).toBe(false);
  runtime.run(src);runtime.step(100);
  expect(initial(engine).ir).toEqual({left:true,right:false});
  runtime.command({type:'reset'});
  expect(engine.snapshot().locks).toEqual({ir:false,button:false});
  runtime.command({type:'ir',side:'left',value:false});
  expect(engine.robot.irLeft).toBe(false);
 });
 it('I: tras cambiar la señal con stop, el siguiente intento válido llega a 4/4 sin re-run',()=>{
  const {engine,runtime}=setup({right:true});
  runtime.run(src);runtime.step(100);runtime.command({type:'stop'});
  apply(runtime,{left:true});
  runtime.run(src);
  const mission=complete(engine,runtime);
  expect(mission.status).toBe('completed');expect(mission.checks.every(c=>c.passed)).toBe(true);
 });
});

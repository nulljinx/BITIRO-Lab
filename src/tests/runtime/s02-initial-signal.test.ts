import {describe,it,expect} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {MINIMAL_IDLE} from '../support/minimal-programs';
import {trackForSession} from '../../content/tracks';

const src=MINIMAL_IDLE;
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
const signalCheck=(e:SimulationEngine)=>e.snapshot().mission.checks.find(c=>c.key==='ir')!;

describe('S02 ejecuta siempre y evalúa la señal de forma pasiva',()=>{
 it('E: sin señal el run inicia igualmente y la misión no avanza',()=>{
  const {engine,runtime}=setup();
  expect(runtime.run(src)).toEqual([]);
  expect(engine.status).toBe('running');expect(engine.programControlled).toBe(true);
  runtime.step(500);
  expect(runtime.diagnostic).toBeNull();
  expect(signalCheck(engine).passed).toBe(false);
  expect(engine.snapshot().mission.status).toBe('in_progress');
 });
 it('tocar un control que el programa nunca lee no define la base',()=>{
  const {engine,runtime}=setup({right:true});
  expect(runtime.run('#include <KnightRoboticsLibs_Iroh.h>\nvoid setup(){inicializarMovimiento();}\nvoid loop(){avanzar(30);pausa(50);}')).toEqual([]);
  runtime.step(500);
  expect(engine.status).toBe('running');
  expect(signalCheck(engine).passed).toBe(false);
 });
});

describe('S02 no ignora cambios de señal durante el intento',()=>{
 it('F: cambiar IR en running o paused se aplica en el motor',()=>{
  const {engine,runtime}=setup({right:true});
  runtime.run(src);runtime.step(100);
  runtime.command({type:'ir',side:'left',value:true});runtime.command({type:'ir',side:'right',value:false});
  expect(engine.robot.irLeft).toBe(true);expect(engine.robot.irRight).toBe(false);
  runtime.command({type:'pause'});
  runtime.command({type:'ir',side:'left',value:false});
  expect(engine.robot.irLeft).toBe(false);
 });
 it('G: el pulsador cambia en running y la base ya elegida por el programa no cambia',()=>{
  const {engine,runtime}=setup({button:true});
  runtime.run(src);runtime.step(100);
  runtime.command({type:'button',value:false});runtime.command({type:'ir',side:'left',value:true});
  expect(engine.robot.buttonPressed).toBe(false);expect(engine.robot.irLeft).toBe(true);
 });
 it('H: stop y reset permiten cambiar señales y preparar un nuevo intento',()=>{
  const {engine,runtime}=setup({right:true});
  runtime.run(src);runtime.step(100);
  runtime.command({type:'stop'});
  runtime.command({type:'ir',side:'right',value:false});runtime.command({type:'ir',side:'left',value:true});
  expect(engine.robot.irLeft).toBe(true);expect(engine.robot.irRight).toBe(false);
  runtime.command({type:'reset'});
  runtime.command({type:'ir',side:'left',value:false});
  expect(engine.robot.irLeft).toBe(false);
 });
});

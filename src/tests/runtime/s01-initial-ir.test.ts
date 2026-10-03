import {describe,it,expect} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {mentorSolutions} from '../../content/mentor-solutions';
import track from '../../content/tracks/s01.json';

const src=mentorSolutions.s01.source;
function setup(left:boolean,right:boolean){
 const engine=new SimulationEngine(track),runtime=new ProgramRuntime(engine);
 runtime.command({type:'ir',side:'left',value:left});
 runtime.command({type:'ir',side:'right',value:right});
 return {engine,runtime};
}
const initialIR=(e:SimulationEngine)=>(e.mission as unknown as {initialIR:{left:boolean;right:boolean}|null}).initialIR;

describe('S01 exige exactamente un IR inicial',()=>{
 it('A: sin IR no inicia',()=>{
  const {engine,runtime}=setup(false,false);
  expect(runtime.run(src)).toEqual([]);
  expect(runtime.blockedReason).toBe('Activa solo IZQ o DER antes de probar S01.');
  expect(engine.status).toBe('idle');expect(engine.programControlled).toBe(false);expect(engine.obstacles).toHaveLength(0);
 });
 it('B: ambos IR no inicia',()=>{
  const {engine,runtime}=setup(true,true);
  runtime.run(src);
  expect(runtime.blockedReason).toBe('S01 necesita un único estímulo inicial. Deja activo solo IZQ o DER.');
  expect(engine.status).toBe('idle');expect(engine.programControlled).toBe(false);
 });
 it('C: solo IZQ inicia con caja izquierda',()=>{
  const {engine,runtime}=setup(true,false);
  expect(runtime.run(src)).toEqual([]);
  expect(runtime.blockedReason).toBeNull();
  expect(engine.status).toBe('running');expect(engine.obstacles).toHaveLength(1);expect(engine.obstacles[0].x).toBe(17);
 });
 it('D: solo DER inicia con caja derecha',()=>{
  const {engine,runtime}=setup(false,true);
  runtime.run(src);
  expect(engine.status).toBe('running');expect(engine.obstacles[0].x).toBe(75);
 });
 it('E: cambiar IR durante el intento no altera ruta, obstáculo ni initialIR',()=>{
  const {engine,runtime}=setup(true,false);
  runtime.run(src);runtime.step(100);
  const before=JSON.stringify(engine.obstacles);
  runtime.command({type:'ir',side:'left',value:false});
  runtime.command({type:'ir',side:'right',value:true});
  expect(engine.robot.irLeft).toBe(true);expect(engine.robot.irRight).toBe(false);
  expect(JSON.stringify(engine.obstacles)).toBe(before);
  expect(initialIR(engine)).toEqual({left:true,right:false});
  runtime.command({type:'pause'});
  runtime.command({type:'ir',side:'right',value:true});
  expect(engine.robot.irRight).toBe(false);
 });
 it('F: stop permite preparar otra elección',()=>{
  const {engine,runtime}=setup(true,false);
  runtime.run(src);runtime.step(100);
  runtime.command({type:'stop'});
  runtime.command({type:'ir',side:'left',value:false});
  runtime.command({type:'ir',side:'right',value:true});
  expect(engine.robot.irRight).toBe(true);expect(engine.obstacles[0].x).toBe(75);
 });
 it('G: IZQ→DER entre intentos mueve el obstáculo y initialIR',()=>{
  const {engine,runtime}=setup(true,false);
  runtime.run(src);expect(engine.obstacles[0].x).toBe(17);
  runtime.command({type:'stop'});
  runtime.command({type:'ir',side:'left',value:false});
  runtime.command({type:'ir',side:'right',value:true});
  runtime.run(src);
  expect(engine.obstacles).toHaveLength(1);expect(engine.obstacles[0].x).toBe(75);
  expect(initialIR(engine)).toEqual({left:false,right:true});
 });
});

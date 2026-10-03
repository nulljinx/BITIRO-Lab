import {describe,it,expect} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {MINIMAL_IDLE} from '../support/minimal-programs';
import track from '../../content/tracks/s01.json';

// Fragmento mínimo: ejecuta el runtime sin resolver la misión. La decisión se simula con eventos sintéticos.
const src=MINIMAL_IDLE;
const readIr=(e:SimulationEngine,left:boolean,right:boolean,lcd:string)=>{e.emit({type:'IR_READ',side:'left',active:left});e.emit({type:'IR_READ',side:'right',active:right});e.emit({type:'LCD_UPDATED',rows:[lcd,'']} as never);};
function setup(left:boolean,right:boolean){
 const engine=new SimulationEngine(track),runtime=new ProgramRuntime(engine);
 runtime.command({type:'ir',side:'left',value:left});
 runtime.command({type:'ir',side:'right',value:right});
 return {engine,runtime};
}
const decision=(e:SimulationEngine)=>e.snapshot().mission.checks.find(c=>c.key==='decision')!.passed;

describe('S01 ejecuta siempre y evalúa la elección IR de forma pasiva',()=>{
 it('A: sin IR inicia igualmente y espera la señal',()=>{
  const {engine,runtime}=setup(false,false);
  expect(runtime.run(src)).toEqual([]);
  expect(engine.status).toBe('running');expect(engine.programControlled).toBe(true);
  runtime.step(300);
  expect(decision(engine)).toBe(false);
 });
 it('B: ambos IR inician igualmente y no se elige ruta',()=>{
  const {engine,runtime}=setup(true,true);
  expect(runtime.run(src)).toEqual([]);
  expect(engine.status).toBe('running');
  runtime.step(300);
  expect(decision(engine)).toBe(false);
  expect(engine.snapshot().mission.status).toBe('in_progress');
 });
 it('C: solo IZQ → el programa lo lee y el evaluador elige la ruta izquierda',()=>{
  const {engine,runtime}=setup(true,false);
  expect(runtime.run(src)).toEqual([]);
  expect(engine.status).toBe('running');expect(engine.obstacles).toHaveLength(2);
  runtime.step(300);
  expect(decision(engine)).toBe(false);
  readIr(engine,true,false,'IR IZQUIERDO');
  expect(decision(engine)).toBe(true);
 });
 it('D: solo DER → el programa lo lee y el evaluador elige la ruta derecha',()=>{
  const {engine,runtime}=setup(false,true);
  runtime.run(src);runtime.step(300);
  expect(engine.status).toBe('running');expect(engine.obstacles).toHaveLength(2);
  readIr(engine,false,true,'IR DERECHO');
  expect(decision(engine)).toBe(true);
 });
 it('F: el motor no ignora cambios de IR en running ni en pausa; la ruta ya elegida no cambia',()=>{
  const {engine,runtime}=setup(true,false);
  runtime.run(src);runtime.step(300);
  const before=JSON.stringify(engine.obstacles);
  runtime.command({type:'ir',side:'left',value:false});
  runtime.command({type:'ir',side:'right',value:true});
  expect(engine.robot.irLeft).toBe(false);expect(engine.robot.irRight).toBe(true);
  expect(JSON.stringify(engine.obstacles)).toBe(before);
  runtime.command({type:'pause'});
  runtime.command({type:'ir',side:'right',value:false});
  expect(engine.robot.irRight).toBe(false);
  runtime.command({type:'resume'});
  expect(engine.status).toBe('running');
 });
});

const BOXES=[{id:'practice-box-left',x:17,y:18},{id:'practice-box-right',x:75,y:18}];
const boxes=(e:SimulationEngine)=>e.snapshot().obstacles.map(({id,x,y})=>({id,x,y}));

describe('S01 carga siempre las dos cajas',()=>{
 const ir=(r:ProgramRuntime,side:'left'|'right',value:boolean)=>r.command({type:'ir',side,value});
 it('A/B: sin IR y sin run hay dos cajas con ids y posiciones correctas',()=>{
  const engine=new SimulationEngine(track);
  expect(engine.snapshot().status).toBe('idle');
  expect(boxes(engine)).toEqual(BOXES);
 });
 it('C: cambiar IR en idle no crea, elimina ni mueve cajas',()=>{
  const {engine,runtime}=setup(false,false);
  ir(runtime,'left',true);expect(boxes(engine)).toEqual(BOXES);
  ir(runtime,'left',false);ir(runtime,'right',true);expect(boxes(engine)).toEqual(BOXES);
  ir(runtime,'right',false);expect(boxes(engine)).toEqual(BOXES);
 });
 it('cambiar IR en running no mueve las cajas',()=>{
  const {engine,runtime}=setup(true,false);runtime.run(src);runtime.step(100);
  const before=boxes(engine);
  ir(runtime,'left',false);ir(runtime,'right',true);
  expect(boxes(engine)).toEqual(before);
 });
 it('I: nuevo intento con IR opuesto no hace spawn/despawn, solo cambia el objetivo evaluado',()=>{
  const {engine,runtime}=setup(true,false);
  runtime.run(src);expect(boxes(engine)).toEqual(BOXES);
  runtime.command({type:'stop'});
  ir(runtime,'left',false);ir(runtime,'right',true);
  expect(boxes(engine)).toEqual(BOXES);
  runtime.run(src);
  expect(boxes(engine)).toEqual(BOXES);
  runtime.step(300);
  readIr(engine,false,true,'IR DERECHO');
  expect(decision(engine)).toBe(true);
 });
});

describe('S01 evalúa la caja correcta',()=>{
 const strike=(engine:SimulationEngine,id:string,side:'left'|'right')=>engine.emit({type:'OBSTACLE_MOVED',obstacleId:id,side});
 const obstacleCheck=(engine:SimulationEngine)=>engine.snapshot().mission.checks.find(c=>c.key==='obstacle')!.passed;
 for(const [irSide,own,other,dir,wrongDir] of [['left','practice-box-left','practice-box-right','right','left'],['right','practice-box-right','practice-box-left','left','right']] as const){
  it(`D/E/F/G: IR ${irSide} espera ${own}; mover la otra caja no cumple`,()=>{
   const {engine,runtime}=setup(irSide==='left',irSide==='right');
   runtime.run(src);
   runtime.step(300);
   readIr(engine,irSide==='left',irSide==='right',irSide==='left'?'IR IZQUIERDO':'IR DERECHO');
   strike(engine,other,dir);strike(engine,other,wrongDir);
   expect(obstacleCheck(engine)).toBe(false);
   strike(engine,own,wrongDir);
   expect(obstacleCheck(engine)).toBe(false);
   strike(engine,own,dir);
   expect(obstacleCheck(engine)).toBe(true);
  });
 }
});

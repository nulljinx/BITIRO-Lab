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
  expect(engine.status).toBe('idle');expect(engine.programControlled).toBe(false);
 });
 it('B: ambos IR no inicia',()=>{
  const {engine,runtime}=setup(true,true);
  runtime.run(src);
  expect(runtime.blockedReason).toBe('S01 necesita un único estímulo inicial. Deja activo solo IZQ o DER.');
  expect(engine.status).toBe('idle');expect(engine.programControlled).toBe(false);
 });
 it('C: solo IZQ inicia y su objetivo es la caja izquierda',()=>{
  const {engine,runtime}=setup(true,false);
  expect(runtime.run(src)).toEqual([]);
  expect(runtime.blockedReason).toBeNull();
  expect(engine.status).toBe('running');expect(engine.obstacles).toHaveLength(2);expect(initialIR(engine)).toEqual({left:true,right:false});
 });
 it('D: solo DER inicia y su objetivo es la caja derecha',()=>{
  const {engine,runtime}=setup(false,true);
  runtime.run(src);
  expect(engine.status).toBe('running');expect(engine.obstacles).toHaveLength(2);expect(initialIR(engine)).toEqual({left:false,right:true});
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
  expect(engine.robot.irRight).toBe(true);expect(engine.obstacles).toHaveLength(2);
 });
 it('G: IZQ→DER entre intentos mueve el obstáculo y initialIR',()=>{
  const {engine,runtime}=setup(true,false);
  runtime.run(src);expect(initialIR(engine)).toEqual({left:true,right:false});
  runtime.command({type:'stop'});
  runtime.command({type:'ir',side:'left',value:false});
  runtime.command({type:'ir',side:'right',value:true});
  runtime.run(src);
  expect(engine.obstacles).toHaveLength(2);
  expect(initialIR(engine)).toEqual({left:false,right:true});
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
 it('running no modifica las cajas al intentar cambiar IR',()=>{
  const {engine,runtime}=setup(true,false);runtime.run(src);runtime.step(100);
  const before=boxes(engine);
  ir(runtime,'left',false);ir(runtime,'right',true);
  expect(boxes(engine)).toEqual(before);
 });
 it('H: reset devuelve las dos cajas a su posición original',()=>{
  const {engine,runtime}=setup(true,false);
  runtime.run(src);
  for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
  expect(boxes(engine)).not.toEqual(BOXES);
  runtime.command({type:'reset'});
  expect(boxes(engine)).toEqual(BOXES);
  ir(runtime,'left',false);ir(runtime,'right',true);
  expect(boxes(engine)).toEqual(BOXES);
 });
 it('I: nuevo intento con IR opuesto no hace spawn/despawn, solo cambia el objetivo',()=>{
  const {engine,runtime}=setup(true,false);
  runtime.run(src);expect(boxes(engine)).toEqual(BOXES);
  runtime.command({type:'stop'});
  ir(runtime,'left',false);ir(runtime,'right',true);
  expect(boxes(engine)).toEqual(BOXES);
  runtime.run(src);
  expect(boxes(engine)).toEqual(BOXES);
  expect(initialIR(engine)).toEqual({left:false,right:true});
 });
});

describe('S01 evalúa la caja correcta',()=>{
 const strike=(engine:SimulationEngine,id:string,side:'left'|'right')=>engine.emit({type:'OBSTACLE_MOVED',obstacleId:id,side});
 const obstacleCheck=(engine:SimulationEngine)=>engine.snapshot().mission.checks.find(c=>c.key==='obstacle')!.passed;
 for(const [irSide,own,other,dir,wrongDir] of [['left','practice-box-left','practice-box-right','right','left'],['right','practice-box-right','practice-box-left','left','right']] as const){
  it(`D/E/F/G: IR ${irSide} espera ${own}; mover la otra caja no cumple`,()=>{
   const {engine,runtime}=setup(irSide==='left',irSide==='right');
   runtime.run(src);
   expect(initialIR(engine)).toEqual({left:irSide==='left',right:irSide==='right'});
   strike(engine,other,dir);strike(engine,other,wrongDir);
   expect(obstacleCheck(engine)).toBe(false);
   strike(engine,own,wrongDir);
   expect(obstacleCheck(engine)).toBe(false);
   strike(engine,own,dir);
   expect(obstacleCheck(engine)).toBe(true);
  });
 }
});

import {describe,it,expect} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {mentorSolutions} from '../../content/mentor-solutions';
import {trackForSession} from '../../content/tracks';

const mentor=mentorSolutions.s05.source;
const DEBOUNCE_LEFT=`      while (irIzq == 1) {
        pausa(20);
        irIzq = leerSensorObstaculoIzquierdo();
      }
`;

function setup(source=mentor){
 const engine=new SimulationEngine(trackForSession('s05')),runtime=new ProgramRuntime(engine);
 expect(runtime.run(source)).toEqual([]);
 const step=(ticks:number)=>{for(let i=0;i<ticks;i++)runtime.step(10);};
 const set=(side:'left'|'right',value:boolean)=>runtime.command({type:'ir',side,value});
 // A human click: ON then OFF, each held for ~220 ms.
 const pulse=(side:'left'|'right',on=22,off=22)=>{set(side,true);step(on);set(side,false);step(off);};
 const checks=()=>Object.fromEntries(engine.snapshot().mission.checks.map(c=>[c.key,c.passed])) as Record<string,boolean>;
 const inJunction=()=>engine.robot.y<67&&engine.robot.y>50;
 const stopped=()=>engine.robot.leftMotor===0&&engine.robot.rightMotor===0;
 /** Runs until the robot has been stopped inside the junction for `ticks` consecutive ticks. */
 const reachJunctionStop=(ticks=35,limit=18000)=>{let n=0;for(let i=0;i<limit&&n<=ticks;i++){step(1);n=inJunction()&&stopped()?n+1:0;}return n>ticks;};
 const untilCompleted=(limit=18000)=>{for(let i=0;i<limit&&engine.snapshot().mission.status!=='completed';i++)step(1);};
 const evaluator=()=>engine.mission as unknown as {s05StartedByLeft:boolean;s05RightActivations:number};
 return {engine,runtime,step,set,pulse,checks,reachJunctionStop,untilCompleted,evaluator,inJunction,stopped};
}

describe('S05: secuencia humana completa',()=>{
 for(const [count,base] of [[1,'Base 1'],[2,'Base 2'],[3,'Base 3'],[4,'Base 3']] as const)
  it(`${count} pulso(s) DER → LCD=${count} → ${base} → 4/4`,()=>{
   const t=setup();t.step(20);
   for(let i=0;i<count;i++)t.pulse('right');
   expect(t.engine.robot.lcd.join(' ')).toContain(String(count));
   t.pulse('left');
   expect(t.reachJunctionStop()).toBe(true);
   t.pulse('left');
   t.untilCompleted();
   const mission=t.engine.snapshot().mission;
   expect(t.runtime.diagnostic).toBeNull();
   expect(mission.status).toBe('completed');
   expect(mission.checks.map(c=>c.key)).toEqual(['counter','line','junction','finish']);
   expect(mission.checks.every(c=>c.passed)).toBe(true);
  });

 it('los checks se aprueban en orden counter → line → junction → finish',()=>{
  const t=setup();t.step(20);
  t.pulse('right');t.pulse('right');t.pulse('left');
  const order=['counter','line','junction','finish'];
  const firstPass:Record<string,number>={};
  let tick=0,authorised=false,still=0;
  for(;tick<18000&&t.engine.snapshot().mission.status!=='completed';tick++){
   t.step(1);
   const c=t.checks();
   for(const key of order){
    if(c[key]&&firstPass[key]===undefined)firstPass[key]=tick;
    const index=order.indexOf(key);
    if(c[key]&&index>0)expect(firstPass[order[index-1]],`${key} aprobado antes que ${order[index-1]}`).toBeDefined();
   }
   if(!authorised){still=t.inJunction()&&t.stopped()?still+1:0;if(still>35){t.set('left',true);t.step(22);t.set('left',false);authorised=true;}}
  }
  expect(Object.keys(firstPass)).toEqual(order);
  expect(firstPass.counter).toBeLessThan(firstPass.line);
  expect(firstPass.line).toBeLessThan(firstPass.junction);
  expect(firstPass.junction).toBeLessThan(firstPass.finish);
 });
});

describe('S05: contador y LCD',()=>{
 const stickySource=mentor.replace('      contador++;\n      mostrarContador();','      contador++;\n      if (contador == 1) mostrarContador();');
 it('5: LCD congelada en 1 con dos pulsos DER → counter falla (sin coincidencia sticky)',()=>{
  expect(stickySource).not.toBe(mentor);
  const t=setup(stickySource);t.step(20);
  t.pulse('right');t.pulse('right');t.pulse('left');
  expect(t.engine.robot.lcd.join(' ')).toContain('1');
  expect(t.checks().counter).toBe(false);
  expect(t.reachJunctionStop()).toBe(true);
  t.pulse('left');t.untilCompleted(6000);
  expect(t.checks().counter).toBe(false);
  expect(t.engine.snapshot().mission.status).not.toBe('completed');
 });
 it('6: LCD corregida a 2 antes de iniciar → counter pasa',()=>{
  const t=setup();t.step(20);
  t.pulse('right');t.pulse('right');t.pulse('left');
  expect(t.checks().counter).toBe(true);
 });
 it('7: borrar la LCD después de validar no deshace counter',()=>{
  const t=setup();t.step(20);
  t.pulse('right');t.pulse('left');
  expect(t.checks().counter).toBe(true);
  t.engine.robot.lcd=['                ','                '];
  t.step(10);
  expect(t.checks().counter).toBe(true);
 });
 it('12: un pulso físico que el programa no procesa cuenta en el evaluador y counter falla',()=>{
  const slow=mentor.replace('      contador++;\n      mostrarContador();','      contador++;\n      mostrarContador();\n      pausa(500);');
  expect(slow).not.toBe(mentor);
  const t=setup(slow);t.step(20);
  t.pulse('right');t.pulse('right');
  expect(t.evaluator().s05RightActivations).toBe(2);
  t.pulse('left');
  expect(t.engine.robot.lcd.join(' ')).toContain('1');
  expect(t.checks().counter).toBe(false);
 });
});

describe('S05: autorizaciones IZQ',()=>{
 it('11: DER e IZQ simultáneos con contador previo 0 no inician en ese tick',()=>{
  const t=setup();t.step(5);
  t.set('right',true);t.set('left',true);t.step(3);
  expect(t.evaluator().s05RightActivations).toBe(1);
  expect(t.evaluator().s05StartedByLeft).toBe(false);
  t.set('right',false);t.set('left',false);t.step(5);
  expect(t.evaluator().s05StartedByLeft).toBe(false);
  t.pulse('left');
  expect(t.evaluator().s05StartedByLeft).toBe(true);
 });
 it('8: IZQ mantenido durante todo el recorrido nunca autoriza la intersección',()=>{
  // Student variant: no IZQ debounce, and a 400 ms stop in the junction before reading IZQ.
  const noDebounce=mentor.split(DEBOUNCE_LEFT).join('').replace('else if (estado == 2) {\n    detenerse();','else if (estado == 2) {\n    detenerse();\n    pausa(400);');
  expect(noDebounce).toContain('pausa(400);');
  expect(noDebounce).not.toBe(mentor);
  const t=setup(noDebounce);t.step(20);
  t.pulse('right');
  t.set('left',true);
  t.reachJunctionStop(35,6000);
  t.step(100);
  expect(t.checks().junction).toBe(false);
  t.untilCompleted(6000);
  expect(t.checks().junction).toBe(false);
  expect(t.engine.snapshot().mission.status).not.toBe('completed');
 });
 it('9: doble flanco IZQ (inicio y junction) autoriza correctamente',()=>{
  const t=setup();t.step(20);
  t.pulse('right');t.pulse('left');
  expect(t.reachJunctionStop()).toBe(true);
  expect(t.checks().junction).toBe(false);
  t.pulse('left');
  expect(t.checks().junction).toBe(true);
 });
 it('10: un segundo IZQ antes de la intersección no autoriza',()=>{
  const t=setup();t.step(20);
  t.pulse('right');t.pulse('left');
  t.step(100);
  expect(t.inJunction()).toBe(false);
  t.pulse('left');
  expect(t.reachJunctionStop(100)).toBe(true);
  expect(t.checks().junction).toBe(false);
  t.step(100);
  expect(t.checks().junction).toBe(false);
 });
 it('IZQ pulsado y mantenido antes de llegar no sirve como segunda señal',()=>{
  const t=setup();t.step(20);
  t.pulse('right');t.pulse('left');
  t.step(100);t.set('left',true);
  t.reachJunctionStop(100);
  t.step(50);
  expect(t.checks().junction).toBe(false);
 });
});

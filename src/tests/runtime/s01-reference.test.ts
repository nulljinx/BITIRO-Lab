import {it,expect} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import track from '../../content/tracks/s01.json';
import left from '../reference-programs/s01-left.cpp?raw';
import right from '../reference-programs/s01-right.cpp?raw';
for(const side of ['left','right'] as const)it(`completa S01 ${side}: decisión, golpe contrario, base y ambos IR`,()=>{
 const engine=new SimulationEngine(track),runtime=new ProgramRuntime(engine);engine.robot.irLeft=side==='left';engine.robot.irRight=side==='right';
 expect(runtime.run(side==='left'?left:right)).toEqual([]);
 const events:typeof engine.events=[];let last=0;
 for(let i=0;i<12000&&!engine.snapshot().finish.arrived&&engine.status==='running';i++){runtime.step(10);events.push(...engine.events.filter(e=>e.sequence>last));last=events.at(-1)?.sequence??0;}
 expect(runtime.diagnostic).toBeNull();expect(engine.robot.lcd[0]).toContain(side==='left'?'IZQUIERDO':'DERECHO');
 expect(events.some(e=>e.type==='OBSTACLE_DETECTED')).toBe(true);
 expect(events.some(e=>e.type==='OBSTACLE_MOVED'&&e.side===(side==='left'?'right':'left'))).toBe(true);
 expect(engine.snapshot().finish.arrived).toBe(true);
 expect(engine.robot.x).toBeLessThan(side==='left'?50:100);if(side==='right')expect(engine.robot.x).toBeGreaterThan(50);
 expect(engine.snapshot().finish.stopped).toBe(false);
 runtime.command({type:'ir',side:'left',value:true});runtime.command({type:'ir',side:'right',value:true});runtime.step(200);
 expect(engine.snapshot().finish.stopped).toBe(true);expect(engine.status).toBe('running');expect(runtime.diagnostic).toBeNull();
});

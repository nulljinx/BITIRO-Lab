import {it,expect} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import track from '../../content/tracks/s01.json';

const source=`
void setup() {
  inicializarMovimiento();
}
void loop() {
  avanzar(30);
  pausa(100);
}
`;

it('can run the same loaded source again from the track start',()=>{
 const engine=new SimulationEngine(track),runtime=new ProgramRuntime(engine);
 runtime.command({type:'ir',side:'left',value:true});
 expect(runtime.run(source)).toEqual([]);
 for(let i=0;i<30;i++)runtime.step(10);
 const firstRun={x:engine.robot.x,y:engine.robot.y,time:engine.robot.simTimeMs};
 expect(firstRun.time).toBeGreaterThan(0);
 expect(firstRun.x!==track.start.x||firstRun.y!==track.start.y).toBe(true);
 runtime.command({type:'stop'});
 expect(runtime.run(source)).toEqual([]);
 expect(engine.robot.x).toBeCloseTo(track.start.x);
 expect(engine.robot.y).toBeCloseTo(track.start.y);
 expect(engine.robot.simTimeMs).toBe(0);
 for(let i=0;i<30;i++)runtime.step(10);
 expect(engine.robot.x).toBeCloseTo(firstRun.x,4);
 expect(engine.robot.y).toBeCloseTo(firstRun.y,4);
});

it('reset clears external IR and button controls while keeping the program reusable',()=>{
 const engine=new SimulationEngine(track),runtime=new ProgramRuntime(engine);
 engine.command({type:'ir',side:'left',value:true});
 engine.command({type:'ir',side:'right',value:true});
 engine.command({type:'button',value:true});
 expect(runtime.run(source)).toEqual([]);
 expect(engine.robot.irLeft).toBe(true);
 expect(engine.robot.irRight).toBe(true);
 expect(engine.robot.buttonPressed).toBe(true);
 runtime.command({type:'reset'});
 expect(engine.status).toBe('idle');
 expect(engine.robot.irLeft).toBe(false);
 expect(engine.robot.irRight).toBe(false);
 expect(engine.robot.buttonPressed).toBe(false);
 engine.command({type:'ir',side:'right',value:true});
 expect(runtime.run(source)).toEqual([]);
 expect(engine.robot.irLeft).toBe(false);
 expect(engine.robot.irRight).toBe(true);
 expect(engine.robot.buttonPressed).toBe(false);
});

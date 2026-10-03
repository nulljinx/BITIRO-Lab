import {describe,expect,it} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {privateSolution,privateSolutionsAvailable} from '../support/private-solutions';
import track from '../../content/tracks/s01.json';

// Needs the real reference programs (outside Git). Skipped without BITIRO_SOLUTIONS_DIR.
describe.skipIf(!privateSolutionsAvailable)('private suite · s01-reference',()=>{
for(const side of ['left','right'] as const)it(`completa S01 ${side}: decisión, seguimiento, base y golpe contrario`,()=>{
 const engine=new SimulationEngine(track),runtime=new ProgramRuntime(engine);
 runtime.command({type:'ir',side:'left',value:side==='left'});
 runtime.command({type:'ir',side:'right',value:side==='right'});
 expect(engine.obstacles).toHaveLength(2);
 expect(runtime.run(privateSolution('s01'))).toEqual([]);
 for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++)runtime.step(10);
 const result=engine.snapshot();
 expect(runtime.diagnostic).toBeNull();
 expect(result.robot.lcd[0]).toContain(side==='left'?'IR IZQUIERDO':'IR DERECHO');
 expect(engine.events.some(e=>e.type==='OBSTACLE_DETECTED')).toBe(true);
 expect(engine.events.some(e=>e.type==='OBSTACLE_MOVED'&&e.side===(side==='left'?'right':'left'))).toBe(true);
 expect(engine.events.some(e=>e.type==='LINE_LOST')).toBe(false);
 expect(result.mission.status).toBe('completed');
 expect(result.mission.checks.every(check=>check.passed)).toBe(true);
 runtime.step(1600);
 expect(engine.robot.leftMotor).toBe(0);
 expect(engine.robot.rightMotor).toBe(0);
 expect(engine.robot.strikeServoPosition).toBe(0);
});

// Passing 4/4 is not enough: the pedagogical point of S01 is a visible one-sensor zig-zag.
for(const side of ['left','right'] as const)it(`S01 ${side}: el seguidor de un sensor hace un zig-zag visible antes de llegar a la base`,()=>{
 const engine=new SimulationEngine(track),runtime=new ProgramRuntime(engine);
 runtime.command({type:'ir',side:'left',value:side==='left'});
 runtime.command({type:'ir',side:'right',value:side==='right'});
 expect(runtime.run(privateSolution('s01'))).toEqual([]);
 const state=()=>engine.robot.leftMotor>0&&engine.robot.rightMotor===0?'A':engine.robot.leftMotor===0&&engine.robot.rightMotor>0?'B':'0';
 const frames:{state:string;heading:number}[]=[];
 const runs:number[]=[];let alternations=0,blackWhite=0,prevState='0',prevBlack:boolean|null=null,runStart=0,runState='0',lastHeading=0;
 for(let i=0;i<12000&&engine.snapshot().mission.status!=='completed';i++){
  runtime.step(10);
  const s=state(),black=engine.robot.lineCenter>=200,heading=engine.robot.heading;
  if(s!=='0'){
   if(prevState!=='0'&&s!==prevState)alternations++;
   if(prevBlack!==null&&black!==prevBlack)blackWhite++;
   prevBlack=black;
  }
  if(s!==runState){ if(runState!=='0')runs.push(Math.abs(lastHeading-runStart)*180/Math.PI); runState=s;runStart=heading; }
  if(s!=='0')prevState=s;
  lastHeading=heading;
  if(i%10===9)frames.push({state:s,heading});
 }
 const states=new Set(frames.map(f=>f.state));
 expect(states.has('A')&&states.has('B')).toBe(true);
 expect(alternations).toBeGreaterThanOrEqual(40);
 expect(blackWhite).toBeGreaterThanOrEqual(40);
 // Amplitude: each correction turns visibly (a 20 ms pause gave ~1.8°) but never exaggeratedly.
 const sorted=[...runs].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
 expect(median).toBeGreaterThanOrEqual(5);
 expect(median).toBeLessThanOrEqual(20);
 // Still visible at the 100 ms telemetry cadence: heading direction keeps reversing between frames.
 let reversals=0;for(let i=2;i<frames.length;i++){const d1=frames[i].heading-frames[i-1].heading,d0=frames[i-1].heading-frames[i-2].heading;if(Math.abs(d1)>.002&&Math.abs(d0)>.002&&Math.sign(d1)!==Math.sign(d0))reversals++;}
 expect(reversals).toBeGreaterThanOrEqual(25);
 expect(engine.events.some(e=>e.type==='LINE_LOST')).toBe(false);
 const mission=engine.snapshot().mission;
 expect(mission.status).toBe('completed');
 expect(mission.checks).toHaveLength(4);
 expect(mission.checks.every(check=>check.passed)).toBe(true);
});


});

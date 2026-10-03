import {it,expect} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {mentorSolutions} from '../../content/mentor-solutions';
import track from '../../content/tracks/s01.json';

for(const side of ['left','right'] as const)it(`completa S01 ${side}: decisión, seguimiento, base y golpe contrario`,()=>{
 const engine=new SimulationEngine(track),runtime=new ProgramRuntime(engine);
 runtime.command({type:'ir',side:'left',value:side==='left'});
 runtime.command({type:'ir',side:'right',value:side==='right'});
 expect(engine.obstacles).toHaveLength(2);
 expect(runtime.run(mentorSolutions.s01.source)).toEqual([]);
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

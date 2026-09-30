import {describe,it,expect} from 'vitest';
import {SimulationEngine} from '../simulator/SimulationEngine';
import {ProgramRuntime} from '../simulator/runtime/ProgramRuntime';
import {trackForSession} from '../content/tracks';
import {mentorSolutions} from '../content/mentor-solutions';

function completeS01(side:'left'|'right'){
 const engine=new SimulationEngine(trackForSession('s01'));
 const runtime=new ProgramRuntime(engine);
 runtime.command({type:'ir',side:'left',value:side==='left'});
 runtime.command({type:'ir',side:'right',value:side==='right'});
 expect(runtime.run(mentorSolutions.s01.source)).toEqual([]);
 for(let tick=0;tick<12000&&engine.snapshot().mission.status!=='completed';tick++)runtime.step(10);
 expect(engine.snapshot().mission.status).toBe('completed');
 return {engine,runtime};
}

describe('Formative mission evaluator',()=>{
 it.each(['left','right'] as const)('recognizes S01 %s only after authentic runtime milestones',side=>{
  const {engine,runtime}=completeS01(side);
  const result=engine.snapshot().mission;
  expect(result.kind).toBe('formative_client_simulation');
  expect(result.status).toBe('completed');
  expect(result.checks).toHaveLength(4);
  expect(result.checks.every(check=>check.passed)).toBe(true);
  runtime.command({type:'reset'});
  expect(engine.snapshot().mission.status).toBe('in_progress');
  expect(engine.snapshot().mission.checks.every(check=>!check.passed)).toBe(true);
 });
 it('never awards completion for a manually dragged robot into a finish zone',()=>{
  const track=trackForSession('s02'),engine=new SimulationEngine(track);
  engine.command({type:'pose',x:track.finishZones[0].x+4,y:track.finishZones[0].y+4,heading:0});
  expect(engine.snapshot().finish.stopped).toBe(true);
  expect(engine.snapshot().mission.status).toBe('in_progress');
 });
 it('uses the saved line calibration only inside the real S02 intersection zone',()=>{
  const track=trackForSession('s02'),engine=new SimulationEngine(track);
  engine.mission.start(engine.robot);
  engine.robot.lineLeft=395;engine.robot.lineCenter=395;engine.robot.lineRight=395;
  engine.robot.leftMotor=0;engine.robot.rightMotor=0;
  engine.setLineThresholds([212,212,212]);
  engine.robot.simTimeMs=500;engine.mission.observeTick(engine.robot);
  expect(engine.snapshot().mission.checks.find(check=>check.key==='cross')?.passed).toBe(false);
  const zone=track.missionZones!.find(item=>item.id==='intersection')!;
  engine.robot.x=zone.x+zone.width/2;engine.robot.y=zone.y+zone.height/2;
  engine.setLineThresholds([420,420,420]);
  engine.robot.simTimeMs=900;engine.mission.observeTick(engine.robot);
  expect(engine.snapshot().mission.checks.find(check=>check.key==='cross')?.passed).toBe(false);
  engine.setLineThresholds([212,212,212]);
  engine.robot.simTimeMs=1300;engine.mission.observeTick(engine.robot);
  expect(engine.snapshot().mission.checks.find(check=>check.key==='cross')?.passed).toBe(true);
 });

 it('requires a real pause at the S02 intersection before awarding the intersection objective',()=>{
  const engine=new SimulationEngine(trackForSession('s02'));
  engine.mission.start(engine.robot);
  engine.emit({type:'IR_READ',side:'left',active:true});
  engine.emit({type:'IR_READ',side:'right',active:false});
  engine.emit({type:'LINE_SENSOR_READ',side:'left'});
  engine.emit({type:'LINE_SENSOR_READ',side:'center'});
  engine.emit({type:'LINE_SENSOR_READ',side:'right'});
  const intersection=trackForSession('s02').missionZones!.find(item=>item.id==='intersection')!;
  engine.robot.x=intersection.x+intersection.width/2;engine.robot.y=intersection.y+intersection.height/2;engine.robot.simTimeMs=100;engine.mission.observeTick(engine.robot);
  engine.robot.lineLeft=400;engine.robot.lineCenter=410;engine.robot.lineRight=420;
  engine.robot.leftMotor=0;engine.robot.rightMotor=0;
  engine.robot.simTimeMs=250;engine.mission.observeTick(engine.robot);
  expect(engine.snapshot().mission.checks.find(check=>check.key==='cross')?.passed).toBe(false);
  engine.robot.simTimeMs=550;engine.mission.observeTick(engine.robot);
  expect(engine.snapshot().mission.checks.find(check=>check.key==='cross')?.passed).toBe(true);
 });
 it.each([
  [false,true,'base1','Base 1'],
  [true,false,'base2','Base 2'],
  [true,true,'base3','Base 3'],
 ] as const)('maps S02 IR selection to %s/%s expected finish', (left,right,expected,label)=>{
  const track=trackForSession('s02'),engine=new SimulationEngine(track);
  engine.command({type:'ir',side:'left',value:left});engine.command({type:'ir',side:'right',value:right});
  engine.mission.start(engine.robot);
  engine.emit({type:'IR_READ',side:'left',active:left});engine.emit({type:'IR_READ',side:'right',active:right});
  engine.emit({type:'LINE_SENSOR_READ',side:'left'});engine.emit({type:'LINE_SENSOR_READ',side:'center'});engine.emit({type:'LINE_SENSOR_READ',side:'right'});
  const intersection=track.missionZones!.find(item=>item.id==='intersection')!;
  engine.robot.x=intersection.x+intersection.width/2;engine.robot.y=intersection.y+intersection.height/2;
  engine.robot.lineLeft=400;engine.robot.lineCenter=410;engine.robot.lineRight=420;engine.robot.leftMotor=0;engine.robot.rightMotor=0;engine.robot.simTimeMs=500;
  engine.mission.observeTick(engine.robot);
  const zone=track.finishZones.find(item=>item.id===expected)!;
  engine.robot.x=zone.x+zone.width/2;engine.robot.y=zone.y+zone.height/2;engine.robot.simTimeMs=900;engine.mission.observeTick(engine.robot);
  const result=engine.snapshot().mission;
  expect(result.checks.find(check=>check.key==='ir')?.label).toContain(label);
  expect(result.checks.find(check=>check.key==='finish')?.label).toContain(label);
  expect(result.checks.find(check=>check.key==='finish')?.passed).toBe(true);
 });

 it('requires three line-sensor reads, intersection and correct IR base for S02',()=>{
  const engine=new SimulationEngine(trackForSession('s02'));
  engine.mission.start(engine.robot);
  engine.emit({type:'IR_READ',side:'left',active:true});
  engine.emit({type:'IR_READ',side:'right',active:false});
  engine.emit({type:'LINE_SENSOR_READ',side:'center'});
  engine.robot.x=49.5;engine.robot.y=25;
  engine.robot.leftMotor=0;engine.robot.rightMotor=0;
  expect(engine.snapshot().mission.status).toBe('in_progress');
  expect(engine.snapshot().mission.checks.find(check=>check.key==='line')?.passed).toBe(false);
  engine.mission.invalidate();
  expect(engine.snapshot().mission.status).toBe('in_progress');
 });
});


describe('S03 challenge evidence',()=>{
 it('starts with its fixed 3 + 3 challenge and four formative checks',()=>{
  const track=trackForSession('s03');
  const engine=new SimulationEngine(track);
  expect(engine.snapshot().obstacles).toHaveLength(3);
  expect(engine.snapshot().scenarioIntersections).toHaveLength(3);
  engine.mission.start(engine.robot);
  const evidence=engine.snapshot().mission;
  expect(evidence.checks.map(check=>check.key)).toEqual(['line','obstacles','lcd','intersections']);
  expect(evidence.status).toBe('in_progress');
 });
});

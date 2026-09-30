import {describe,expect,it} from 'vitest';
import {SimulationEngine} from '../simulator/SimulationEngine';
import {isInsideFinishZone} from '../simulator/finish';
import {hasSimulation,trackForSession} from '../content/tracks';

describe('interactive track registry',()=>{
 it('exposes S01, S02 and S03',()=>{
  expect(hasSimulation('s01')).toBe(true);
  expect(hasSimulation('s02')).toBe(true);
  expect(hasSimulation('s03')).toBe(true);
 });

 it('loads the official S03 plotter at 100 × 180 cm',()=>{
  const track=trackForSession('s03');
  expect(track.physicalWidthCm).toBe(100);
  expect(track.physicalHeightCm).toBe(180);
  expect(track.finishZones).toHaveLength(0);
  expect(track.paths[0].id).toBe('main-loop');
  expect(track.paths[0].points.length).toBeGreaterThan(200);
 });
 it('keeps the S03 robot aligned and loads its fixed challenge scenario',()=>{
  const snapshot=new SimulationEngine(trackForSession('s03')).snapshot();
  expect(snapshot.robot.lineCenter).toBeGreaterThan(300);
  expect(snapshot.obstacles).toHaveLength(3);
  expect(snapshot.scenarioIntersections).toHaveLength(3);
 });
 it('loads S02 with the three target bases and physical dimensions',()=>{
  const track=trackForSession('s02');
  expect(track.physicalWidthCm).toBe(100);
  expect(track.physicalHeightCm).toBe(200);
  expect(track.finishZones.map(zone=>zone.id)).toEqual(['base1','base2','base3']);
  expect(track.paths.length).toBeGreaterThanOrEqual(8);
  expect(track.missionZones?.find(zone=>zone.id==='intersection')).toBeTruthy();
 });
 it('starts S02 aligned with the printed line',()=>{
  const snapshot=new SimulationEngine(trackForSession('s02')).snapshot();
  expect(snapshot.robot.lineCenter).toBeGreaterThan(300);
  expect(snapshot.robot.lineLeft).toBeLessThan(120);
  expect(snapshot.robot.lineRight).toBeLessThan(120);
 });
 it('places each branch endpoint inside its corresponding finish zone',()=>{
  const track=trackForSession('s02');
  const branchIds=['branch-left','branch-center','branch-right'];
  for(let index=0;index<branchIds.length;index++){
   const path=track.paths.find(item=>item.id===branchIds[index]);
   expect(path).toBeTruthy();
   const point=path!.points.at(-1)!;
   expect(isInsideFinishZone(point,track)?.id).toBe(`base${index+1}`);
  }
 });
});

import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {WorkerCommand,WorkerResponse} from '../../simulator/types';

const VALID='void setup(){}void loop(){}';
const RUNTIME_FAULT='void f(){f();}void setup(){f();}void loop(){}';
let posted:WorkerResponse[];
let scope:{postMessage:(m:WorkerResponse)=>void;onmessage:((e:{data:WorkerCommand})=>void)|null};

async function boot(){
 vi.resetModules();
 posted=[];
 scope={postMessage:m=>{posted.push(m);},onmessage:null};
 vi.stubGlobal('self',scope);
 await import('../../simulator/worker/simulator.worker');
}
const send=(command:unknown)=>scope.onmessage!({data:command as WorkerCommand});
const take=()=>posted.splice(0);
const types=(messages:WorkerResponse[])=>messages.map(m=>m.type);

beforeEach(()=>{vi.useFakeTimers();});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});

describe('simulator worker dispatcher',()=>{
 it('ignores every command until a track is configured',async()=>{
  await boot();
  send({type:'load-program',source:VALID,requestId:1});
  send({type:'reset'});
  send({type:'set-line-thresholds',values:{left:1,center:2,right:3}});
  expect(posted).toEqual([]);
 });
 it('answers configure-track with track-ready carrying the track id and an idle snapshot',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s02'});
  const [ready,...rest]=take();
  expect(rest).toEqual([]);
  expect(ready.type).toBe('track-ready');
  if(ready.type!=='track-ready')throw new Error('unreachable');
  expect(ready.trackId).toBe('s02');
  expect(ready.snapshot.status).toBe('idle');
 });
 it('swallows an unknown track silently and keeps serving the previous track',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s01'});take();
  expect(()=>send({type:'configure-track',trackId:'s99'})).not.toThrow();
  expect(posted).toEqual([]);
  send({type:'load-program',source:VALID,requestId:5});
  expect(types(take())).toEqual(['compile-ok','snapshot']);
 });
 it('configure-track S01 publishes both practice boxes, and ir never changes them',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s01'});
  const ready=take()[0];
  if(ready.type!=='track-ready')throw new Error('expected track-ready');
  const boxes=(o:{id:string;x:number;y:number}[])=>o.map(({id,x,y})=>({id,x,y}));
  const initial=boxes(ready.snapshot.obstacles);
  expect(initial).toEqual([{id:'practice-box-left',x:17,y:18},{id:'practice-box-right',x:75,y:18}]);
  send({type:'ir',side:'left',value:true});
  const messages=take();
  expect(types(messages)).toEqual(['snapshot']);
  const snap=messages[0];
  if(snap.type!=='snapshot')throw new Error('expected snapshot');
  expect(snap.snapshot.status).toBe('idle');
  expect(boxes(snap.snapshot.obstacles)).toEqual(initial);
 });
 it('run-program on S02 without an initial signal is blocked, not compiled or started',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s02'});take();
  send({type:'run-program',source:VALID,requestId:9});
  const [blocked,snap]=take();
  expect(blocked).toEqual({type:'run-blocked',requestId:9,message:'Selecciona una señal inicial para S02: IZQ, DER, ambos IR o el pulsador.'});
  if(snap.type!=='snapshot')throw new Error('expected snapshot');
  expect(snap.snapshot.status).toBe('idle');
 });
 it('load-program reviews without running and echoes the requestId',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s01'});take();
  send({type:'load-program',source:VALID,requestId:41});
  const [ok,snap]=take();
  expect(ok).toEqual({type:'compile-ok',requestId:41,running:false});
  expect(snap.type).toBe('snapshot');
  if(snap.type==='snapshot')expect(snap.snapshot.status).toBe('idle');
 });
 it('run-program starts execution and echoes the requestId with running:true',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s01'});take();
  send({type:'ir',side:'left',value:true});take();send({type:'run-program',source:VALID,requestId:42});
  const [ok,snap]=take();
  expect(ok).toEqual({type:'compile-ok',requestId:42,running:true});
  if(snap.type!=='snapshot')throw new Error('expected snapshot');
  expect(snap.snapshot.status).toBe('running');
 });
 it('reports compile errors with the requestId and diagnostics, without starting the run',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s01'});take();
  send({type:'ir',side:'left',value:true});take();send({type:'run-program',source:'void setup(){ int ;',requestId:7});
  const [error,snap]=take();
  expect(error.type).toBe('compile-error');
  if(error.type!=='compile-error')throw new Error('unreachable');
  expect(error.requestId).toBe(7);
  expect(error.diagnostics.length).toBeGreaterThan(0);
  if(snap.type!=='snapshot')throw new Error('expected snapshot');
  expect(snap.snapshot.status).not.toBe('running');
 });
 it('maps stop-program to a stop of the engine',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s01'});
  send({type:'ir',side:'left',value:true});take();send({type:'run-program',source:VALID,requestId:1});take();
  send({type:'stop-program'});
  const [snap]=take();
  if(snap.type!=='snapshot')throw new Error('expected snapshot');
  expect(snap.snapshot.status).not.toBe('running');
 });
 it('does not let a previous run contaminate a new configuration of the same track',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s01'});
  const fresh=(take()[0] as Extract<WorkerResponse,{type:'track-ready'}>).snapshot;
  send({type:'run-program',source:VALID,requestId:1});
  vi.advanceTimersByTime(500);take();
  send({type:'configure-track',trackId:'s01'});
  const again=take();
  expect(types(again)).toEqual(['track-ready']);
  const ready=again[0] as Extract<WorkerResponse,{type:'track-ready'}>;
  expect(ready.snapshot.status).toBe('idle');
  expect(ready.snapshot.robot).toEqual(fresh.robot);
 });
 it('cancels the pending tick of the previous track when a new track is configured',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s01'});
  send({type:'ir',side:'left',value:true});
  send({type:'run-program',source:VALID,requestId:1});take();
  expect(vi.getTimerCount()).toBe(1);
  send({type:'configure-track',trackId:'s02'});take();
  expect(vi.getTimerCount()).toBe(0);
  vi.advanceTimersByTime(1000);
  expect(posted).toEqual([]);
 });
 it('serialises a runtime fault as runtime-error with a diagnostic, once, and an error snapshot',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s01'});take();
  send({type:'ir',side:'left',value:true});take();send({type:'run-program',source:RUNTIME_FAULT,requestId:3});take();
  vi.advanceTimersByTime(200);
  const messages=take();
  const errors=messages.filter(m=>m.type==='runtime-error');
  expect(errors).toHaveLength(1);
  if(errors[0].type!=='runtime-error')throw new Error('unreachable');
  expect(errors[0].diagnostic.kind).toBe('ExecutionLimitError');
  const last=messages.filter(m=>m.type==='snapshot').at(-1);
  if(last?.type!=='snapshot')throw new Error('expected snapshot');
  expect(last.snapshot.status).toBe('error');
 });
 it('treats an unknown command as a no-op that still publishes a snapshot (current behaviour)',async()=>{
  await boot();
  send({type:'configure-track',trackId:'s01'});take();
  expect(()=>send({type:'does-not-exist'})).not.toThrow();
  expect(types(take())).toEqual(['snapshot']);
 });
});

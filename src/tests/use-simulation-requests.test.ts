import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {Snapshot,WorkerCommand,WorkerResponse} from '../simulator/types';

// Minimal hook runtime: just enough to execute the real useSimulation closures without a DOM or a new dependency.
const h=vi.hoisted(()=>{
 const slots:unknown[]=[];let cursor=0;let effects:Array<()=>void>=[];let dirty=false;
 const same=(a:unknown[]|undefined,b:unknown[]|undefined)=>!!a&&!!b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const memo=<T,>(make:()=>T,deps:unknown[])=>{const i=cursor++;const s=slots[i] as {v:T;deps:unknown[]}|undefined;if(s&&same(s.deps,deps))return s.v;const v=make();slots[i]={v,deps};return v;};
 return {
  reset(){slots.length=0;cursor=0;effects=[];dirty=false;},
  begin(){cursor=0;dirty=false;},
  flush(){const run=effects;effects=[];run.forEach(fn=>fn());},
  isDirty:()=>dirty,
  useState<T>(init:T|(()=>T)){const i=cursor++;if(!(i in slots))slots[i]={v:typeof init==='function'?(init as ()=>T)():init};const s=slots[i] as {v:T};return [s.v,(next:T|((p:T)=>T))=>{const value=typeof next==='function'?(next as (p:T)=>T)(s.v):next;if(!Object.is(value,s.v)){s.v=value;dirty=true;}}] as const;},
  useRef<T>(init:T){const i=cursor++;if(!(i in slots))slots[i]={current:init};return slots[i] as {current:T};},
  useMemo:memo,
  useCallback:<T,>(fn:T,deps:unknown[])=>memo(()=>fn,deps),
  useEffect(fn:()=>void|(()=>void),deps:unknown[]){const i=cursor++;const s=slots[i] as {deps:unknown[];cleanup?:void|(()=>void)}|undefined;if(s&&same(s.deps,deps))return;effects.push(()=>{s?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
 };
});
vi.mock('react',()=>({useState:h.useState,useRef:h.useRef,useMemo:h.useMemo,useCallback:h.useCallback,useEffect:h.useEffect}));

import {useSimulation} from '../features/simulator/useSimulation';
import {SimulationEngine} from '../simulator/SimulationEngine';
import {trackForSession} from '../content/tracks';
import {SOURCE_LIMIT_MESSAGE} from '../simulator/runtime/source-size';

class FakeWorker{
 static all:FakeWorker[]=[];
 sent:WorkerCommand[]=[];terminated=false;
 onmessage:((e:{data:WorkerResponse})=>void)|null=null;onerror:((e:{preventDefault():void})=>void)|null=null;onmessageerror:(()=>void)|null=null;
 constructor(){FakeWorker.all.push(this);}
 postMessage(c:WorkerCommand){this.sent.push(c);}
 terminate(){this.terminated=true;}
 emit(data:WorkerResponse){this.onmessage?.({data});}
}
type Hook=ReturnType<typeof useSimulation>;
let hook:Hook,current:string;
function render(sessionId=current){current=sessionId;do{h.begin();hook=useSimulation(sessionId);h.flush();}while(h.isDirty());return hook;}
const snap=(trackId:string):Snapshot=>new SimulationEngine(trackForSession(trackId)).snapshot();
const worker=()=>FakeWorker.all.at(-1)!;
function ready(sessionId='s01'){
 const hookResult=render(sessionId);
 worker().emit({type:'track-ready',trackId:sessionId,snapshot:snap(sessionId)});
 render();
 return hookResult;
}
const lastRun=()=>worker().sent.filter(c=>c.type==='run-program'||c.type==='load-program').at(-1) as Extract<WorkerCommand,{requestId:number}>;

beforeEach(()=>{vi.useFakeTimers();h.reset();FakeWorker.all=[];vi.stubGlobal('Worker',FakeWorker);});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});

describe('useSimulation startup',()=>{
 it('configures the requested track and becomes ready only for the matching track-ready',()=>{
  render('s02');
  expect(worker().sent).toEqual([{type:'configure-track',trackId:'s02'}]);
  expect(hook.engineState).toBe('starting');
  worker().emit({type:'track-ready',trackId:'s01',snapshot:snap('s01')});render();
  expect(hook.engineState).toBe('starting');
  worker().emit({type:'track-ready',trackId:'s02',snapshot:snap('s02')});render();
  expect(hook.engineState).toBe('ready');
 });
 it('fails with the startup message after 10 s without track-ready and terminates the worker',()=>{
  render('s01');
  vi.advanceTimersByTime(9999);render();
  expect(hook.engineState).toBe('starting');
  vi.advanceTimersByTime(1);render();
  expect(hook.engineState).toBe('error');
  expect(hook.engineError).toBe('El motor no respondió al iniciar. Tu código sigue en el editor.');
  expect(hook.reviewState).toBe('Motor no disponible');
  expect(hook.snapshot.status).toBe('error');
  expect(worker().terminated).toBe(true);
 });
 it('does not start the startup deadline timer twice nor fail once ready',()=>{
  ready();
  vi.advanceTimersByTime(60000);render();
  expect(hook.engineState).toBe('ready');
 });
 it('ignores worker traffic other than track-ready until ready',()=>{
  render('s01');
  worker().emit({type:'compile-ok',requestId:0,running:true});
  worker().emit({type:'snapshot',snapshot:{...snap('s01'),status:'running'}});render();
  expect(hook.reviewState).toBe('Listo');
  expect(hook.snapshot.status).toBe('idle');
 });
 it('maps worker errors to engine error states',()=>{
  render('s01');worker().emit({type:'track-ready',trackId:'s01',snapshot:snap('s01')});render();
  worker().onerror!({preventDefault(){}});render();
  expect(hook.engineError).toBe('El motor se interrumpió. Reinícialo para continuar con tu código.');
  h.reset();FakeWorker.all=[];ready();
  worker().onmessageerror!();render();
  expect(hook.engineError).toBe('No se pudo leer la respuesta del motor.');
 });
 it('retry creates a fresh worker and terminates the previous one',()=>{
  ready();const first=worker();
  hook.retry();render();
  expect(first.terminated).toBe(true);
  expect(FakeWorker.all).toHaveLength(2);
  expect(hook.engineState).toBe('starting');
 });
 it('switching session terminates the old worker and configures the new track',()=>{
  ready('s01');const first=worker();
  render('s03');
  expect(first.terminated).toBe(true);
  expect(worker().sent).toEqual([{type:'configure-track',trackId:'s03'}]);
  expect(hook.loadedSource).toBeNull();
 });
});

describe('useSimulation request ids',()=>{
 it('sends monotonically increasing request ids',()=>{
  ready();
  hook.source('a',true);const first=lastRun().requestId;
  hook.source('b',false);const second=lastRun().requestId;
  expect(second).toBe(first+1);
  expect(lastRun().type).toBe('load-program');
 });
 it('a compile-ok for the current request updates state (run: Ejecutando and loadedSource)',()=>{
  ready();
  hook.source('code',true);render();
  expect(hook.reviewState).toBe('Cargando programa…');
  const {requestId}=lastRun();
  worker().emit({type:'compile-ok',requestId,running:true});render();
  expect(hook.reviewState).toBe('Ejecutando');
  expect(hook.loadedSource).toBe('code');
  expect(hook.programLoaded).toBe(true);
 });
 it('a compile-ok for review only reports "Sin errores" and does not load a program',()=>{
  ready();
  hook.source('code',false);
  worker().emit({type:'compile-ok',requestId:lastRun().requestId,running:false});render();
  expect(hook.reviewState).toBe('Sin errores');
  expect(hook.loadedSource).toBeNull();
 });
 it('a stale compile-ok does not replace the state of a newer request',()=>{
  ready();
  hook.source('old',true);const stale=lastRun().requestId;
  hook.source('new',true);
  worker().emit({type:'compile-ok',requestId:stale,running:true});render();
  expect(hook.reviewState).toBe('Cargando programa…');
  expect(hook.loadedSource).toBeNull();
  worker().emit({type:'compile-ok',requestId:lastRun().requestId,running:true});render();
  expect(hook.loadedSource).toBe('new');
 });
 it('a stale compile-error does not overwrite diagnostics of a newer request',()=>{
  ready();
  const diagnostic={kind:'SyntaxError',message:'x',line:1,column:1,endLine:1,endColumn:2} as never;
  hook.source('old',false);const stale=lastRun().requestId;
  hook.source('new',false);
  worker().emit({type:'compile-error',requestId:stale,diagnostics:[diagnostic]});render();
  expect(hook.diagnostics).toEqual([]);
  expect(hook.reviewState).toBe('Revisando');
  worker().emit({type:'compile-error',requestId:lastRun().requestId,diagnostics:[diagnostic]});render();
  expect(hook.diagnostics).toEqual([diagnostic]);
  expect(hook.reviewState).toBe('Error');
 });
 it('a current compile-error clears the pending run so loadedSource stays unset',()=>{
  ready();
  hook.source('bad',true);
  worker().emit({type:'compile-error',requestId:lastRun().requestId,diagnostics:[]});render();
  expect(hook.loadedSource).toBeNull();
  expect(hook.reviewState).toBe('Error');
 });
 it.each(['reset','stop-program','stop','pose'] as const)('%s invalidates an in-flight request',type=>{
  ready();
  hook.source('code',true);const {requestId}=lastRun();
  hook.send(type==='pose'?{type:'pose',x:0,y:0,heading:0}:{type} as WorkerCommand);
  worker().emit({type:'compile-ok',requestId,running:true});render();
  expect(hook.loadedSource).toBeNull();
  expect(hook.reviewState).not.toBe('Ejecutando');
 });
 it('uses distinct review labels for reset, stop and pose',()=>{
  ready();
  hook.send({type:'reset'});render();expect(hook.reviewState).toBe('Todo listo para un nuevo intento');
  hook.send({type:'stop-program'});render();expect(hook.reviewState).toBe('Prueba detenida · puedes probar otra vez');
  hook.send({type:'stop'});render();expect(hook.reviewState).toBe('Prueba detenida · puedes probar otra vez');
  hook.send({type:'pose',x:0,y:0,heading:0});render();expect(hook.reviewState).toBe('Listo');
 });
 it('other commands are forwarded without touching request state',()=>{
  ready();
  hook.source('code',true);const {requestId}=lastRun();
  hook.send({type:'speed',value:2});
  worker().emit({type:'compile-ok',requestId,running:true});render();
  expect(hook.loadedSource).toBe('code');
 });
 it('runtime-error always shows its diagnostic, regardless of request id',()=>{
  ready();
  const diagnostic={kind:'ExecutionLimitError',message:'boom'} as never;
  worker().emit({type:'runtime-error',diagnostic});render();
  expect(hook.diagnostics).toEqual([diagnostic]);
  expect(hook.reviewState).toBe('Error');
 });
 it('program-finished updates the review label',()=>{
  ready();
  worker().emit({type:'program-finished'});render();
  expect(hook.reviewState).toBe('Prueba terminada · puedes probar otra vez');
 });
 it('snapshots update both state and the latest ref',()=>{
  ready();
  const running={...snap('s01'),status:'running' as const};
  worker().emit({type:'snapshot',snapshot:running});render();
  expect(hook.snapshot).toBe(running);
  expect(hook.latest.current).toBe(running);
 });
 it('runLoadedProgram re-runs the loaded source under a new request id',()=>{
  ready();
  hook.runLoadedProgram();
  expect(worker().sent.some(c=>c.type==='run-program')).toBe(false);
  hook.source('code',true);const first=lastRun().requestId;
  worker().emit({type:'compile-ok',requestId:first,running:true});render();
  hook.runLoadedProgram();
  expect(lastRun()).toMatchObject({type:'run-program',source:'code',requestId:first+1});
 });
 it('resetTrial sends reset',()=>{
  ready();hook.resetTrial();
  expect(worker().sent.at(-1)).toEqual({type:'reset'});
 });
});

describe('useSimulation deadlines and guards',()=>{
 it('fails with the review deadline message after 10 s without an answer',()=>{
  ready();hook.source('code',false);
  vi.advanceTimersByTime(9999);render();
  expect(hook.engineState).toBe('ready');
  vi.advanceTimersByTime(1);render();
  expect(hook.engineState).toBe('error');
  expect(hook.engineError).toBe('La revisión tardó demasiado. Reinicia el motor e inténtalo de nuevo.');
  expect(worker().terminated).toBe(true);
 });
 it('an answer for the current request cancels the deadline',()=>{
  ready();hook.source('code',false);
  worker().emit({type:'compile-ok',requestId:lastRun().requestId,running:false});
  vi.advanceTimersByTime(60000);render();
  expect(hook.engineState).toBe('ready');
 });
 it('a stale answer does not cancel the deadline of the newer request',()=>{
  ready();
  hook.source('old',false);const stale=lastRun().requestId;
  hook.source('new',false);
  worker().emit({type:'compile-ok',requestId:stale,running:false});
  vi.advanceTimersByTime(10000);render();
  expect(hook.engineState).toBe('error');
 });
 it('reset and stop clear the pending deadline',()=>{
  ready();hook.source('code',true);
  hook.send({type:'reset'});
  vi.advanceTimersByTime(60000);render();
  expect(hook.engineState).toBe('ready');
 });
 it('after a failure, a late answer of the old request is ignored and nothing is sent',()=>{
  ready();hook.source('code',true);const {requestId}=lastRun();const w=worker();
  vi.advanceTimersByTime(10000);render();
  w.emit({type:'compile-ok',requestId,running:true});render();
  expect(hook.loadedSource).toBeNull();
  const sent=w.sent.length;
  hook.source('again',true);hook.send({type:'reset'});
  expect(w.sent).toHaveLength(sent);
 });
 it('rejects oversized source locally with the limit message and does not post',()=>{
  ready();const sent=worker().sent.length;
  hook.source('a'.repeat(40000),true);render();
  expect(hook.reviewState).toBe(SOURCE_LIMIT_MESSAGE);
  expect(worker().sent).toHaveLength(sent);
 });
 it('ignores source and commands while the engine is not ready',()=>{
  render('s01');
  hook.source('code',true);hook.send({type:'reset'});hook.runLoadedProgram();hook.resetTrial();
  expect(worker().sent).toEqual([{type:'configure-track',trackId:'s01'}]);
 });
 it('a replaced instance cannot be updated by the old worker (cleanup sets disposed)',()=>{
  ready('s01');const old=worker();
  render('s02');
  old.emit({type:'track-ready',trackId:'s01',snapshot:snap('s01')});
  old.emit({type:'compile-ok',requestId:0,running:true});render();
  expect(hook.engineState).toBe('starting');
  expect(hook.reviewState).toBe('Listo');
 });
 it('reports a postMessage failure as an engine error',()=>{
  ready();
  worker().postMessage=()=>{throw new Error('clone');};
  hook.source('code',true);render();
  expect(hook.engineError).toBe('No se pudo enviar el programa al motor.');
 });
});

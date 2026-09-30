import {SimulationEngine} from '../SimulationEngine';
import {ProgramRuntime} from '../runtime/ProgramRuntime';
import {trackForSession} from '../../content/tracks';
import type {WorkerCommand, WorkerResponse} from '../types';
import {PHYSICS_STEP_MS, TELEMETRY_MS} from '../config';

let engine:SimulationEngine|null=null, runtime:ProgramRuntime|null=null;
let previous=performance.now(), lastSent=0, lastDiagnostic:ProgramRuntime['diagnostic']=null, lastStatus:import('../types').Status='idle';
let timer:ReturnType<typeof setTimeout>|undefined;
const post=(message:WorkerResponse)=>self.postMessage(message);
const snapshot=()=>{if(!engine)return;post({type:'snapshot',snapshot:engine.snapshot()});lastSent=performance.now();};
function schedule() {
  clearTimeout(timer); timer=undefined;
  if(engine?.status==='running') timer=setTimeout(tick,PHYSICS_STEP_MS);
}
function tick() {
  if(!engine||!runtime)return;
  const now=performance.now();
  runtime.step(Math.min(now-previous,100)*engine.speed); previous=now;
  if(runtime.diagnostic&&runtime.diagnostic!==lastDiagnostic) post({type:'runtime-error',diagnostic:runtime.diagnostic});
  lastDiagnostic=runtime.diagnostic;
  if(engine.status==='finished'&&lastStatus!=='finished') post({type:'program-finished'});
  if(now-lastSent>=TELEMETRY_MS||engine.status!==lastStatus) snapshot();
  lastStatus=engine.status; schedule();
}
function configure(trackId:string){
  clearTimeout(timer);timer=undefined;
  const track=trackForSession(trackId);
  engine=new SimulationEngine(track);runtime=new ProgramRuntime(engine);previous=performance.now();lastSent=0;lastDiagnostic=runtime.diagnostic;lastStatus=engine.status;
  post({type:'track-ready',trackId,snapshot:engine.snapshot()});
}
self.onmessage=(event:MessageEvent<WorkerCommand>)=>{
  const command=event.data;
  if(command.type==='configure-track'){try{configure(command.trackId);}catch{ /* Unknown tracks are blocked by the main UI. */ }return;}
  if(!engine||!runtime)return;
  if(command.type==='set-line-thresholds'){
    engine.setLineThresholds(command.values);
  } else if(command.type==='set-s03-layout'){
    engine.setS03Layout(command.obstacles,command.intersections);
  } else if(command.type==='load-program'||command.type==='run-program'){
    const diagnostics=command.type==='run-program'?runtime.run(command.source):runtime.review(command.source);
    post(diagnostics.length?{type:'compile-error',requestId:command.requestId,diagnostics}:{type:'compile-ok',requestId:command.requestId,running:command.type==='run-program'});
    lastDiagnostic=runtime.diagnostic;
  } else runtime.command(command.type==='stop-program'?{type:'stop'}:command);
  previous=performance.now(); lastStatus=engine.status; snapshot(); schedule();
};

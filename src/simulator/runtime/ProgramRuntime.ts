import type {SimulationEngine} from '../SimulationEngine';
import type {Command} from '../types';
import {Parser} from './parser/Parser';
import {validate} from './parser/validate';
import {Interpreter} from './interpreter/Interpreter';
import {IrohRuntimeAdapter} from './IrohRuntimeAdapter';
import {LanguageError,diagnosticFor} from './interpreter/RuntimeError';
import type {Diagnostic,Execution,RuntimeWait} from './runtime-types';
import {LIMITS} from './runtime-limits';
import {PHYSICS_STEP_MS} from '../config';
export class ProgramRuntime {
 diagnostic:Diagnostic|null=null;blockedReason:string|null=null;private execution:Execution<void>|null=null;private wait:RuntimeWait|null=null;private accumulated=0;
 constructor(public readonly engine:SimulationEngine){}
 review(source:string):Diagnostic[]{try{validate(new Parser(source).parse());return [];}catch(error){return [diagnosticFor(error)];}}
 run(source:string):Diagnostic[]{
  this.blockedReason=null;
  try{const program=new Parser(source).parse();validate(program);
   const issue=this.engine.startIssue();
   if(issue){this.blockedReason=issue;this.engine.feedback=issue;return [];}
   this.cancel();this.diagnostic=null;this.engine.status='compiling';
   const {irLeft,irRight,buttonPressed}=this.engine.robot;this.engine.reset();Object.assign(this.engine.robot,{irLeft,irRight,buttonPressed});this.execution=new Interpreter(program,new IrohRuntimeAdapter(this.engine)).run();this.engine.freezeInitialStimuli();this.engine.programControlled=true;this.engine.status='running';this.engine.mission.start(this.engine.robot);this.engine.emit({type:'PROGRAM_STARTED'});return [];}
  catch(error){this.fail(error);return [this.diagnostic!];}
 }
 private cancel(){this.execution?.return();this.execution=null;this.wait=null;this.accumulated=0;this.engine.robot.leftMotor=0;this.engine.robot.rightMotor=0;}
 command(command:Command){if(command.type==='reset'||command.type==='stop'||command.type==='motors'||command.type==='pose'){if(command.type==='stop')this.engine.mission.stopAttempt(this.engine.robot);this.cancel();this.diagnostic=null;this.engine.programControlled=false;if(command.type!=='stop')this.engine.mission.invalidate();}this.engine.command(command);}
 private fail(error:unknown){this.diagnostic=diagnosticFor(error);this.cancel();this.engine.status='error';this.engine.mission.invalidate();this.engine.emit({type:'RUNTIME_ERROR',message:this.diagnostic.message});}
 private slice(){
  if(!this.execution)return;
  if(this.wait){if(this.wait.type==='button'?!this.engine.robot.buttonPressed:this.engine.robot.simTimeMs<this.wait.untilSimMs)return;this.wait=null;}
  let instructions=0;
  try{while(this.execution){const next=this.execution.next();if(next.done){this.execution=null;break;}const action=next.value;
   if(action.kind==='instruction'){this.engine.instructions++;if(++instructions>LIMITS.instructions)throw new LanguageError('ExecutionLimitError','Tu programa está ejecutando demasiadas instrucciones seguidas sin darle tiempo al IROH para reaccionar. Añade una pausa dentro del ciclo.',action.loc);}
   else if(action.kind==='wait'){this.wait=action.wait;break;}
   else if(action.kind==='loop-boundary')break;
   else {this.engine.mission.stopAttempt(this.engine.robot);this.cancel();this.engine.status='finished';this.engine.emit({type:'PROGRAM_FINISHED'});break;}
  }}catch(error){this.fail(error);}
 }
 step(ms:number){if(!Number.isFinite(ms)||ms<0)throw new RangeError('El paso debe ser finito y positivo.');if(this.engine.status!=='running')return;this.accumulated+=ms;while(this.accumulated>=PHYSICS_STEP_MS&&this.engine.status==='running'){this.accumulated-=PHYSICS_STEP_MS;this.slice();this.engine.tick();}}
}

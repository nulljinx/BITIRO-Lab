import type {MissionEvidence} from '../../simulator/MissionEvaluator';
import type {Status} from '../../simulator/types';

// One pure derivation for everything that says "how is this mission going": header counter, badge, icon and card.
// The counter always comes from the same evidence the badge comes from, so "superada" can never sit next to 0/4.
export type MissionPhase='ready'|'running'|'stopped'|'ended'|'error'|'passed';
export interface MissionView{
  phase:MissionPhase;
  passed:number;
  total:number;
  badge:string;
  note:string|null;
}

export function deriveMissionView(input:{evidence:MissionEvidence;status:Status;ticks:number;previouslyPassed:boolean}):MissionView{
  const {evidence,status,ticks,previouslyPassed}=input;
  const total=evidence.checks.length,passed=evidence.checks.filter(check=>check.passed).length;
  // Completion is only trusted when every check agrees (the evaluator freezes the evidence at that moment).
  if(evidence.status==='completed'&&total>0&&passed===total)return {phase:'passed',passed,total,badge:'Superada en este intento',note:null};
  const earlier=previouslyPassed?'Ya superaste esta misión antes. Este intento empieza de cero y no borra ese resultado.':null;
  if(status==='error')return {phase:'error',passed,total,badge:'Con errores',note:earlier};
  if(status==='running'||status==='paused'||status==='compiling')return {phase:'running',passed,total,badge:'Intento en curso',note:earlier};
  if(status==='finished')return {phase:'ended',passed,total,badge:'Programa terminado',note:earlier};
  if(ticks>0)return {phase:'stopped',passed,total,badge:'Intento detenido',note:earlier};
  return {phase:'ready',passed,total,badge:previouslyPassed?'Reiniciada · nuevo intento':'Ver objetivos',note:earlier};
}

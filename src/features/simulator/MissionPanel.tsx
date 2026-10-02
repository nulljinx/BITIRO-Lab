import {useEffect,useRef,useState} from 'react';
import {Check,CheckCircle2,Circle,CloudOff} from 'lucide-react';
import type {MissionEvidence} from '../../simulator/MissionEvaluator';
import type {CloudContext} from '../code-editor/cloud-learning';
import {submitFormativeMission} from '../code-editor/cloud-learning';

export function MissionPanel({evidence,cloudContext}:{evidence:MissionEvidence;cloudContext?:CloudContext}){
 const [sync,setSync]=useState<'idle'|'sending'|'saved'|'error'>('idle');
 const submitted=useRef(false);
 async function submit(){
  if(!cloudContext||evidence.status!=='completed'||submitted.current)return;
  submitted.current=true;setSync('sending');
  try{
   await submitFormativeMission(cloudContext,evidence);
   setSync('saved');
   window.dispatchEvent(new CustomEvent('bitiro:mission-saved',{detail:{cohortId:cloudContext.cohortId,sessionId:evidence.sessionId}}));
  }catch{setSync('error');submitted.current=false;}
 }
 useEffect(()=>{if(evidence.status==='completed'&&cloudContext&&!submitted.current)void submit();},[evidence.status,cloudContext?.cohortId,cloudContext?.activityVersion,evidence.sessionId]);
 if(!evidence.checks.length)return null;
 return <details className="mission-panel" data-tour="mission" open={evidence.status==='completed'}>
  <summary><span className="mission-panel-title">{evidence.status==='completed'?<CheckCircle2 size={17}/>:<Circle size={17}/>}Objetivos de la misión · {evidence.checks.filter(check=>check.passed).length}/{evidence.checks.length}</span><span>{evidence.status==='completed'?'Superada en simulador':'Ver objetivos'}</span></summary>
  <ol>{evidence.checks.map(check=><li key={check.key}>{check.passed?<Check size={15}/>:<Circle size={15}/>}<span>{check.label}</span></li>)}</ol>
  {evidence.status==='completed'&&<p role="status">Resultado de práctica autoevaluado por el simulador. No equivale a una calificación ni a validación del mentor.</p>}
  {cloudContext&&evidence.status==='completed'&&<p role="status">{sync==='saved'?'Resultado sincronizado con tu grupo.':sync==='sending'?'Guardando resultado de práctica…':sync==='error'?<>No se pudo sincronizar. <button type="button" onClick={()=>void submit()}><CloudOff size={14}/>Reintentar</button></>:'Preparando sincronización…'}</p>}
 </details>;
}

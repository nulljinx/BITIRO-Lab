import {useEffect,useMemo,useState} from 'react';
import {CheckCircle2,Copy,MousePointer2,RotateCcw,Save,ScanLine} from 'lucide-react';
import {getStorageScope,scopedStorageKey} from '../code-editor/storage';
import type {LineThresholds} from '../../simulator/types';
import type {SimulationConnection} from './useSimulation';

export type S02Thresholds=LineThresholds;
type Surface='white'|'black'|'edge';
type TripleReading={values:S02Thresholds;x:number;y:number};
type S02Pattern='center'|'right'|'left'|'intersection';

const KEY='bitiro-s02-calibration-v1';
const REQUIRED_READINGS=3;
const MIN_SAMPLE_DISTANCE_CM=5;
const WHITE_MAX=150;
const BLACK_MIN=220;
const SENSOR_NAMES=['Izquierdo','Centro','Derecho'] as const;
const SENSOR_SHORT=['I','C','D'] as const;
const PATTERNS:[S02Pattern,string,string][]=[
 ['center','Centro','AVANZAR'],
 ['right','Derecha','GIRAR DERECHA'],
 ['left','Izquierda','GIRAR IZQUIERDA'],
 ['intersection','Intersección','DETENERSE'],
];

export function loadS02Thresholds():S02Thresholds{
 try{
  const value=JSON.parse(localStorage.getItem(scopedStorageKey(KEY))||'null');
  if(Array.isArray(value)&&value.length===3&&value.every(n=>Number.isInteger(n)&&n>=0&&n<=1023))return value as S02Thresholds;
 }catch{/* Keep the classroom reference when storage is unavailable. */}
 return [200,200,200];
}

function surfaceFromReading(value:number):Surface{
 if(value<=WHITE_MAX)return 'white';
 if(value>=BLACK_MIN)return 'black';
 return 'edge';
}
function farEnough(readings:TripleReading[],x:number,y:number){
 return readings.every(sample=>Math.hypot(sample.x-x,sample.y-y)>=MIN_SAMPLE_DISTANCE_CM);
}
function maxima(samples:TripleReading[]):S02Thresholds{
 return [0,1,2].map(index=>Math.max(...samples.map(sample=>sample.values[index]))) as S02Thresholds;
}
function minima(samples:TripleReading[]):S02Thresholds{
 return [0,1,2].map(index=>Math.min(...samples.map(sample=>sample.values[index]))) as S02Thresholds;
}
function patternFor(values:S02Thresholds,thresholds:S02Thresholds):S02Pattern|null{
 const black=values.map((value,index)=>value>=thresholds[index]);
 if(!black[0]&&black[1]&&!black[2])return 'center';
 if(!black[0]&&!black[1]&&black[2])return 'right';
 if(black[0]&&!black[1]&&!black[2])return 'left';
 if(black[0]&&black[1]&&black[2])return 'intersection';
 return null;
}

export function useS02Calibration(simulation:SimulationConnection,enabled:boolean){
 const [scope]=useState(getStorageScope);
 const initial=loadS02Thresholds();
 const [whiteSamples,setWhiteSamples]=useState<TripleReading[]>([]),[blackSamples,setBlackSamples]=useState<TripleReading[]>([]);
 const [thresholds,setThresholds]=useState<S02Thresholds>(initial),[savedThresholds,setSavedThresholds]=useState<S02Thresholds>(initial);
 const [decisionMade,setDecisionMade]=useState(false),[testedPatterns,setTestedPatterns]=useState<S02Pattern[]>([]),[saved,setSaved]=useState(false),[message,setMessage]=useState('');
 const {robot}=simulation.snapshot;
 const current=[robot.lineLeft,robot.lineCenter,robot.lineRight] as S02Thresholds;
 const surfaces=current.map(surfaceFromReading) as [Surface,Surface,Surface];
 const whiteReady=whiteSamples.length>=REQUIRED_READINGS,blackReady=blackSamples.length>=REQUIRED_READINGS;
 const whiteMax=whiteReady?maxima(whiteSamples):null,blackMin=blackReady?minima(blackSamples):null;
 const rangesSeparate=!!whiteMax&&!!blackMin&&whiteMax.every((value,index)=>value<blackMin[index]);
 const ready=whiteReady&&blackReady&&rangesSeparate;
 const canCaptureWhite=!whiteReady&&surfaces.every(value=>value==='white')&&farEnough(whiteSamples,robot.x,robot.y);
 const canCaptureBlack=whiteReady&&!blackReady&&surfaces.every(value=>value==='black')&&farEnough(blackSamples,robot.x,robot.y);
 const currentPattern=decisionMade?patternFor(current,thresholds):null;
 const checkResult=testedPatterns.length===PATTERNS.length?'pass':null;
 const canSave=ready&&decisionMade&&checkResult==='pass';

 useEffect(()=>{
  if(simulation.track.id==='s02'&&simulation.engineState==='ready')simulation.send({type:'set-line-thresholds',values:savedThresholds});
 },[simulation.engineState,simulation.send,simulation.track.id,savedThresholds]);
 useEffect(()=>{if(enabled)setMessage('');},[enabled]);

 function capture(kind:'white'|'black'){
  const list=kind==='white'?whiteSamples:blackSamples;
  const allExpected=surfaces.every(value=>value===kind);
  if(!allExpected){
   setMessage(kind==='white'
    ?'Los tres sensores deben quedar completamente sobre blanco antes de registrar.'
    :'Busca una franja negra transversal: los tres sensores deben quedar sobre negro al mismo tiempo.');
   return;
  }
  if(!farEnough(list,robot.x,robot.y)){
   setMessage('Mueve el IROH a otro punto de la pista antes de registrar la siguiente medición.');
   return;
  }
  const reading={values:[...current] as S02Thresholds,x:robot.x,y:robot.y};
  const next=[...list,reading].slice(0,REQUIRED_READINGS);
  if(kind==='white'){
   setWhiteSamples(next);
   setMessage(next.length===REQUIRED_READINGS?'Blanco listo. Ahora busca una franja negra ancha para medir los tres sensores.':`Medición blanca ${next.length}/${REQUIRED_READINGS} registrada.`);
  }else{
   setBlackSamples(next);
   if(next.length===REQUIRED_READINGS){
    setDecisionMade(false);setTestedPatterns([]);
    setMessage('Mediciones listas. Calcula un umbral distinto para I, C y D.');
   }else setMessage(`Medición negra ${next.length}/${REQUIRED_READINGS} registrada.`);
  }
  setSaved(false);
 }

 function update(values:S02Thresholds){
  if(!whiteMax||!blackMin||!ready){setMessage('Primero completa las mediciones de blanco y negro.');return;}
  const rounded=values.map(value=>Math.round(value)) as S02Thresholds;
  for(let index=0;index<3;index++){
   if(!Number.isFinite(rounded[index])){setMessage(`Escribe un número para el sensor ${SENSOR_NAMES[index].toLowerCase()}.`);return;}
   if(rounded[index]<=whiteMax[index]||rounded[index]>=blackMin[index]){
    setMessage(`El umbral ${SENSOR_SHORT[index]} debe ser mayor que ${whiteMax[index]} y menor que ${blackMin[index]}.`);return;
   }
  }
  setThresholds(rounded);setDecisionMade(true);setTestedPatterns([]);setSaved(false);
  setMessage('Tres umbrales elegidos. Ahora comprueba los cuatro casos trabajados en clase.');
 }

 function testCurrent(){
  if(!decisionMade){setMessage('Primero calcula y registra los tres umbrales.');return;}
  if(!currentPattern){setMessage('Esta posición mezcla casos. Mueve un poco el IROH hasta obtener uno de los cuatro casos de S02.');return;}
  const next=testedPatterns.includes(currentPattern)?testedPatterns:[...testedPatterns,currentPattern];
  setTestedPatterns(next);setSaved(false);
  const label=PATTERNS.find(([id])=>id===currentPattern)?.[1]??currentPattern;
  setMessage(next.length===PATTERNS.length?'¡Listo! Tus umbrales reconocen los cuatro casos de S02.':`${label} comprobado. Te faltan ${PATTERNS.length-next.length} caso(s).`);
 }

 function clear(){
  setWhiteSamples([]);setBlackSamples([]);setThresholds(savedThresholds);setDecisionMade(false);setTestedPatterns([]);setSaved(false);
  setMessage('Mediciones reiniciadas. Empieza con los tres sensores sobre blanco.');
 }
 function save():S02Thresholds|null{
  if(!canSave){setMessage('Antes de guardar, comprueba los cuatro casos de seguimiento.');return null;}
  try{
   localStorage.setItem(scopedStorageKey(KEY,scope),JSON.stringify(thresholds));
   setSavedThresholds(thresholds);simulation.send({type:'set-line-thresholds',values:thresholds});setSaved(true);
   setMessage(`Calibración guardada: I=${thresholds[0]}, C=${thresholds[1]}, D=${thresholds[2]}.`);return thresholds;
  }catch{
   setMessage(`No se pudo guardar. Anota tus valores: I=${thresholds[0]}, C=${thresholds[1]}, D=${thresholds[2]}.`);return null;
  }
 }
 return {whiteSamples,blackSamples,current,surfaces,thresholds,savedThresholds,whiteReady,blackReady,whiteMax,blackMin,ready,decisionMade,testedPatterns,currentPattern,checkResult,canCaptureWhite,canCaptureBlack,canSave,saved,message,capture,update,testCurrent,clear,save};
}

function TripleSamples({values}:{values:TripleReading[]}){
 return <div className="s02-calibration-samples" aria-label={`${values.length} de ${REQUIRED_READINGS} mediciones registradas`}>
  {Array.from({length:REQUIRED_READINGS},(_,index)=>{
   const reading=values[index];
   return <div key={index} className={reading?'filled':''}><b>{index+1}</b>{reading?<span>I {reading.values[0]} · C {reading.values[1]} · D {reading.values[2]}</span>:<span>Sin medir</span>}</div>;
  })}
 </div>;
}

function PatternPreview({current,thresholds,currentPattern}:{current:S02Thresholds;thresholds:S02Thresholds;currentPattern:S02Pattern|null}){
 const labels=current.map((value,index)=>value>=thresholds[index]?'NEGRO':'BLANCO');
 const action=currentPattern?PATTERNS.find(([id])=>id===currentPattern)?.[2]:'—';
 return <div className="s02-pattern-preview">
  <div className="s02-pattern-sensors">{labels.map((label,index)=><span key={SENSOR_SHORT[index]} className={label==='NEGRO'?'black':'white'}><b>{SENSOR_SHORT[index]}</b>{label}</span>)}</div>
  <div className="s02-pattern-action"><span>El programa interpreta</span><strong>{action}</strong></div>
 </div>;
}

export function S02CalibrationPanel({calibration,onSaved}:{calibration:ReturnType<typeof useS02Calibration>;onSaved:(values:S02Thresholds)=>void}){
 const activeStep=!calibration.whiteReady?1:!calibration.blackReady?2:!calibration.decisionMade?3:calibration.checkResult!=='pass'?4:5;
 const stepClass=(step:number,done:boolean)=>`${activeStep===step?'active ':''}${done?'done':''}`.trim();
 const [drafts,setDrafts]=useState<[string,string,string]>(['','','']);
 const [copied,setCopied]=useState(false);
 useEffect(()=>{if(activeStep===3&&!calibration.decisionMade)setDrafts(['','','']);},[activeStep,calibration.decisionMade]);
 const task=useMemo(()=>{
  if(activeStep===1)return {title:'Mide el blanco',text:'Pon los tres sensores sobre blanco y registra 3 mediciones en puntos distintos.'};
  if(activeStep===2)return {title:'Mide el negro',text:'Usa una franja negra transversal para que I, C y D estén sobre negro al mismo tiempo.'};
  if(activeStep===3)return {title:'Calcula tres umbrales',text:'Cada sensor responde distinto. Calcula un valor intermedio para I, C y D.'};
  if(activeStep===4)return {title:'Prueba los cuatro casos',text:'Comprueba centro, derecha, izquierda e intersección como los trabajaste en clase.'};
  return {title:'Calibración lista',text:'Guarda tus tres valores y llévalos al programa de S02.'};
 },[activeStep]);
 const code=`int umbralI = ${calibration.thresholds[0]};\nint umbralC = ${calibration.thresholds[1]};\nint umbralD = ${calibration.thresholds[2]};`;
 async function copyCode(){try{await navigator.clipboard.writeText(code);setCopied(true);window.setTimeout(()=>setCopied(false),1500);}catch{/* Clipboard can be unavailable in embedded contexts. */}}
 return <aside className="calibration-panel calibration-guide s02-calibration-guide" aria-label="Calibración guiada de los tres sensores de S02">
  <div className="calibration-heading"><span className="calibration-icon"><ScanLine size={18}/></span><div><span className="eyebrow">Calibración S02</span><h2>Compara los tres sensores del IROH.</h2></div></div>
  <div className="calibration-steps calibration-steps-five" aria-label="Pasos de calibración">
   <span className={stepClass(1,calibration.whiteReady)}><b>{calibration.whiteReady?'✓':'1'}</b>Blanco</span>
   <span className={stepClass(2,calibration.blackReady)}><b>{calibration.blackReady?'✓':'2'}</b>Negro</span>
   <span className={stepClass(3,calibration.decisionMade)}><b>{calibration.decisionMade?'✓':'3'}</b>Umbrales</span>
   <span className={stepClass(4,calibration.checkResult==='pass')}><b>{calibration.checkResult==='pass'?'✓':'4'}</b>Casos</span>
   <span className={stepClass(5,calibration.saved)}><b>{calibration.saved?'✓':'5'}</b>Guardar</span>
  </div>

  <section id="calibration-instructions" className="calibration-task"><div className="calibration-task-number">{activeStep}</div><div><strong>{task.title}</strong><p>{task.text}</p></div></section>

  <section className="s02-live-readings" aria-live="polite">
   {calibration.current.map((value,index)=><div key={SENSOR_SHORT[index]}><span>{SENSOR_NAMES[index]}</span><strong>{value}</strong><small>{calibration.surfaces[index]==='black'?'NEGRO':calibration.surfaces[index]==='white'?'BLANCO':'BORDE'}</small></div>)}
  </section>

  {activeStep===1&&<section className="calibration-step-card">
   <div className="calibration-card-head"><strong>Mediciones sobre blanco</strong><span>{calibration.whiteSamples.length}/{REQUIRED_READINGS}</span></div>
   <TripleSamples values={calibration.whiteSamples}/>
   <p><MousePointer2 size={14}/>Arrastra el IROH a una zona blanca donde los tres sensores queden fuera de la línea.</p>
   <button className="primary calibration-main-action" disabled={!calibration.canCaptureWhite} onClick={()=>calibration.capture('white')}>Registrar los tres sensores</button>
  </section>}

  {activeStep===2&&<section className="calibration-step-card">
   <div className="calibration-card-head"><strong>Mediciones sobre negro</strong><span>{calibration.blackSamples.length}/{REQUIRED_READINGS}</span></div>
   <TripleSamples values={calibration.blackSamples}/>
   <p><MousePointer2 size={14}/>Usa una franja transversal negra, como la de inicio o una base, para poner I, C y D sobre negro.</p>
   <button className="primary calibration-main-action" disabled={!calibration.canCaptureBlack} onClick={()=>calibration.capture('black')}>Registrar los tres sensores</button>
  </section>}

  {activeStep===3&&calibration.whiteMax&&calibration.blackMin&&<section className="calibration-step-card s02-threshold-card">
   <p><strong>Ahora te toca calcular.</strong> Cada respuesta debe quedar entre la mayor lectura blanca y la menor lectura negra de ese sensor.</p>
   <form onSubmit={event=>{event.preventDefault();calibration.update(drafts.map(value=>Number(value)) as S02Thresholds);}}>
    {SENSOR_NAMES.map((name,index)=><label key={name}><span><b>{SENSOR_SHORT[index]}</b>{name}</span><div className="s02-threshold-equation"><strong>{calibration.whiteMax![index]}</strong><i>&lt;</i><input aria-label={`Umbral ${name}`} type="number" inputMode="numeric" value={drafts[index]} placeholder="?" min={calibration.whiteMax![index]+1} max={calibration.blackMin![index]-1} onChange={event=>setDrafts(values=>values.map((value,i)=>i===index?event.target.value:value) as [string,string,string])}/><i>&lt;</i><strong>{calibration.blackMin![index]}</strong></div></label>)}
    <button className="primary calibration-main-action" type="submit" disabled={drafts.some(value=>!value.trim())}>Usar mis tres umbrales</button>
   </form>
  </section>}

  {activeStep===4&&<section className="calibration-step-card s02-test-card">
   <PatternPreview current={calibration.current} thresholds={calibration.thresholds} currentPattern={calibration.currentPattern}/>
   <div className="s02-pattern-progress">{PATTERNS.map(([id,label,action])=><div key={id} className={calibration.testedPatterns.includes(id)?'done':''}>{calibration.testedPatterns.includes(id)?<CheckCircle2 size={15}/>:<span/>}<p><strong>{label}</strong><small>{action}</small></p></div>)}</div>
   <p>Mueve el IROH para formar uno de los cuatro casos y compruébalo. No necesitas seguir ningún orden.</p>
   <button className="primary calibration-main-action" disabled={!calibration.currentPattern} onClick={calibration.testCurrent}>Comprobar este caso</button>
  </section>}

  {activeStep===5&&<section className="calibration-step-card calibration-success-card">
   <CheckCircle2 size={24}/><div><strong>Tus tres sensores ya están calibrados.</strong><p>Estos son los valores que debes usar en el seguidor de línea de S02.</p></div>
   <div className="calibration-code-value s02-code-value"><pre>{code}</pre><button type="button" onClick={()=>void copyCode()}><Copy size={14}/>{copied?'Copiado':'Copiar'}</button></div>
  </section>}

  {calibration.message&&<p className="calibration-guide-message" role="status">{calibration.message}</p>}
  <div className={`calibration-guide-footer ${activeStep===5?'is-ready':''}`}>
   <button className="calibration-reset" onClick={calibration.clear}><RotateCcw size={15}/>Reiniciar mediciones</button>
   {activeStep===5&&<button className="primary save-thresholds" disabled={!calibration.canSave} onClick={()=>{const saved=calibration.save();if(saved)onSaved(saved);}}><Save size={17}/>Guardar calibración y volver</button>}
  </div>
 </aside>;
}

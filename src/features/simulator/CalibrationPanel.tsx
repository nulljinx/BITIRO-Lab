import {useEffect,useState} from 'react';
import {getStorageScope,scopedStorageKey} from '../code-editor/storage';
import {Trash2,Save,Home,MousePointer2,ScanLine,CheckCircle2,Lightbulb,ShieldCheck,Code2} from 'lucide-react';
import type {SimulationConnection} from './useSimulation';
import type {LineThresholds} from '../../simulator/types';
export type Thresholds=LineThresholds;
type Sample={min:number;max:number;count:number};
type CheckResult='pass'|'fail'|null;
const empty=():Sample[]=>Array.from({length:3},()=>({min:Infinity,max:-Infinity,count:0}));
const key='bitiro-s01-calibration-v1';
const WHITE_MAX=150;
const BLACK_MIN=220;
export function loadThresholds():Thresholds{try{const value=JSON.parse(localStorage.getItem(scopedStorageKey(key))||'null');if(Array.isArray(value)&&value.length===3&&value.every(n=>Number.isInteger(n)&&n>=0&&n<=1023))return value as Thresholds;}catch{/* Keep default reference when storage is unavailable. */}return [200,200,200];}
export function useCalibration(simulation:SimulationConnection,enabled:boolean){
 const [scope]=useState(getStorageScope);
 const initial=loadThresholds();
 const [samples,setSamples]=useState(empty),[thresholds,setThresholds]=useState<Thresholds>(initial),[savedThresholds,setSavedThresholds]=useState<Thresholds>(initial),[edited,setEdited]=useState(false),[message,setMessage]=useState('');
 const [decisionMade,setDecisionMade]=useState(false),[checkResult,setCheckResult]=useState<CheckResult>(null),[saved,setSaved]=useState(false),[sampledZones,setSampledZones]=useState<string[]>([]);
 const {robot}=simulation.snapshot;
 useEffect(()=>{
  if(!enabled)return;
  const values=[robot.lineLeft,robot.lineCenter,robot.lineRight];
  const collectingBlack=samples.every(sample=>Number.isFinite(sample.min)&&sample.min<=WHITE_MAX);
  const accepted=collectingBlack?values.some(value=>value>=BLACK_MIN):values.some(value=>value<=WHITE_MAX);
  setSamples(old=>{
   const whiteComplete=old.every(sample=>Number.isFinite(sample.min)&&sample.min<=WHITE_MAX);
   if(!whiteComplete){
    return old.map((sample,index)=>{
     const value=values[index];
     if(value>WHITE_MAX)return sample;
     return {...sample,min:Math.min(sample.min,value),count:sample.count+1};
    });
   }
   return old.map((sample,index)=>{
    const value=values[index];
    if(value<BLACK_MIN)return sample;
    return {...sample,max:Math.max(sample.max,value),count:sample.count+1};
   });
  });
  if(accepted){
   const height=Math.max(1,simulation.track.physicalHeightCm),zone=robot.y<height/3?'superior':robot.y<height*2/3?'media':'inferior';
   setSampledZones(old=>old.includes(zone)?old:[...old,zone]);
  }
 },[enabled,robot.x,robot.y,robot.heading,robot.lineLeft,robot.lineCenter,robot.lineRight,simulation.track.physicalHeightCm]);
 useEffect(()=>{if(!edited)setThresholds(old=>old.map((n,i)=>samples[i].max-samples[i].min>=30?Math.round((samples[i].min+samples[i].max)/2):n) as Thresholds);},[samples,edited]);
 useEffect(()=>{if(simulation.engineState==='ready')simulation.send({type:'set-line-thresholds',values:savedThresholds});},[simulation.engineState,simulation.send,savedThresholds]);
 const whiteReady=samples.every(sample=>Number.isFinite(sample.min)&&sample.min<=WHITE_MAX);
 const blackReady=whiteReady&&samples.every(sample=>Number.isFinite(sample.max)&&sample.max>=BLACK_MIN);
 const recommended=samples.map((sample,i)=>sample.max-sample.min>=30?Math.round((sample.min+sample.max)/2):thresholds[i]) as Thresholds;
 const ready=blackReady&&samples.every(s=>s.max-s.min>=30)&&thresholds.every(n=>Number.isInteger(n)&&n>=0&&n<=1023);
 const canSave=ready&&decisionMade&&checkResult==='pass';
 function save():Thresholds|null{if(!canSave){setMessage('Antes de guardar, elige un umbral y comprueba que separa correctamente blanco y negro.');return null;}try{localStorage.setItem(scopedStorageKey(key,scope),JSON.stringify(thresholds));const applied=[...thresholds] as Thresholds;setSavedThresholds(applied);simulation.send({type:'set-line-thresholds',values:applied});setSaved(true);setMessage(`Calibración guardada. Izq ${applied[0]} · Centro ${applied[1]} · Der ${applied[2]}.`);return applied;}catch{setMessage('No se pudo guardar. Anota los umbrales para conservarlos.');return null;}}
 function clear(){setSamples(empty());setThresholds([...savedThresholds] as Thresholds);setEdited(false);setDecisionMade(false);setCheckResult(null);setSaved(false);setSampledZones([]);setMessage('Muestras borradas. Empieza buscando una superficie blanca.');}
 function update(i:number,n:number){setEdited(true);setDecisionMade(true);setCheckResult(null);setSaved(false);setMessage('');setThresholds(old=>old.map((v,j)=>i===j?n:v) as Thresholds);}
 function useRecommended(){if(!ready){setMessage('Primero registra blanco y negro en los tres sensores.');return;}setThresholds([...recommended] as Thresholds);setEdited(true);setDecisionMade(true);setCheckResult(null);setSaved(false);setMessage(`BITIRO propone ${recommended[0]}, ${recommended[1]} y ${recommended[2]} porque están aproximadamente a mitad de camino entre blanco y negro. Ahora comprueba la elección.`);}
 function check(){if(!ready){setCheckResult('fail');setMessage('Todavía faltan muestras de blanco y negro para comprobar el umbral.');return;}if(!decisionMade){setCheckResult('fail');setMessage('Elige primero un umbral: puedes modificarlo o usar el valor recomendado.');return;}const separates=thresholds.every((value,i)=>Number.isFinite(value)&&value>samples[i].min&&value<samples[i].max);setCheckResult(separates?'pass':'fail');setSaved(false);setMessage(separates?'¡Bien! Tus umbrales separan las lecturas de blanco y negro. Ahora observa cómo se usan en una condición y guarda la calibración.':'Revisa tu elección: cada umbral debe quedar entre la lectura de blanco y la lectura de negro.');}
 return {samples,thresholds,recommended,savedThresholds,save,clear,update,useRecommended,check,message,ready,canSave,decisionMade,checkResult,saved,sampledZones,whiteReady,blackReady};
}
export function CalibrationPanel({simulation,calibration,activeSensor,onSensor,onSaved}:{simulation:SimulationConnection;calibration:ReturnType<typeof useCalibration>;activeSensor:number;onSensor:(index:number)=>void;onSaved:(values:Thresholds)=>void}){
 const {robot}=simulation.snapshot;
 const names=['Izquierdo','Centro','Derecho'];
 const current=[robot.lineLeft,robot.lineCenter,robot.lineRight][activeSensor];
 const readyCount=calibration.samples.filter(sample=>sample.max-sample.min>=30).length;
 const whiteReady=calibration.whiteReady;
 const blackReady=calibration.blackReady;
 const activeStep=!whiteReady?1:!blackReady?2:!calibration.decisionMade?3:calibration.checkResult!=='pass'?4:5;
 const stepText=activeStep===1?'Busca una superficie blanca y mueve los tres sensores por distintas zonas.':activeStep===2?'Bien. Ahora pasa los tres sensores por la línea negra en distintos lugares.':activeStep===3?'Compara las lecturas y elige una frontera para cada sensor.':activeStep===4?'Comprueba si tus tres umbrales separan blanco y negro.':'Observa cómo usar los umbrales en el código y guarda la calibración.';
 const activeSample=calibration.samples[activeSensor];
 const activeReady=activeSample.max-activeSample.min>=30;
 const activeThreshold=calibration.thresholds[activeSensor];
 const sliderMin=activeReady?Math.round(activeSample.min):0,sliderMax=activeReady?Math.round(activeSample.max):1023;
 const sliderValue=Number.isFinite(activeThreshold)?Math.max(sliderMin,Math.min(sliderMax,activeThreshold)):sliderMin;
 const stepClass=(step:number,done:boolean)=>`${activeStep===step?'active ':''}${done?'done':''}`.trim();
 const pendingLabel=!whiteReady?'Falta medir blanco':!blackReady?'Falta medir negro':'Mediciones listas';
 return <aside className="calibration-panel" aria-label="Calibración de sensores">
  <div className="calibration-heading"><span className="calibration-icon"><ScanLine size={18}/></span><div><span className="eyebrow">Calibración</span><h2>Aprende a usar el umbral.</h2></div></div>
  <div className="calibration-steps calibration-steps-five" aria-label="Pasos de calibración">
   <span className={stepClass(1,whiteReady)}><b>1</b>Blanco</span>
   <span className={stepClass(2,blackReady)}><b>2</b>Negro</span>
   <span className={stepClass(3,blackReady&&calibration.decisionMade)}><b>3</b>Elegir</span>
   <span className={stepClass(4,calibration.checkResult==='pass')}><b>4</b>Probar</span>
   <span className={stepClass(5,calibration.saved)}><b>5</b>Código</span>
  </div>
  <p id="calibration-instructions" className="calibration-intro"><MousePointer2 size={15}/><span><strong>{stepText}</strong><small>Arrastra el IROH por la pista. Las flechas sirven para ajustes finos.</small></span></p>
  <div className="calibration-learning-note">
   <div className="calibration-learning-head"><Lightbulb size={15}/><strong>Antes de elegir el umbral</strong><b>{calibration.sampledZones.length}/3 zonas</b></div>
   <div className="calibration-learning-points">
    <div><span className="learning-dot"/><p><strong>La superficie varía.</strong> Papel, impresión y luz pueden cambiar un poco la lectura.</p></div>
    <div><ScanLine size={13}/><p><strong>Cada sensor es distinto.</strong> Izquierdo, centro y derecho pueden necesitar umbrales diferentes.</p></div>
   </div>
  </div>
  <div className="calibration-live"><span>Lectura activa</span><strong>{current}</strong><small>{names[activeSensor]} · {readyCount}/3 con contraste</small></div>
  <table><caption><div className="calibration-caption"><span>{readyCount}/3 sensores con contraste.</span><span className={calibration.ready?'calibration-ready':'calibration-pending'}>{calibration.ready?<><CheckCircle2 size={12}/>Listos</>:pendingLabel}</span></div></caption><thead><tr><th scope="col">Sensor</th><th scope="col">Blanco</th><th scope="col">Negro</th><th scope="col">Umbral</th></tr></thead><tbody>{names.map((name,i)=>{const sample=calibration.samples[i],sampleReady=sample.max-sample.min>=30;return <tr key={name} className={`${activeSensor===i?'selected ':''}${sampleReady?'sample-ready':'sample-pending'}`}><th scope="row"><button aria-pressed={activeSensor===i} onClick={()=>onSensor(i)}><i/>{name}</button></th><td>{Number.isFinite(sample.min)?sample.min:'—'}</td><td>{Number.isFinite(sample.max)?sample.max:'—'}</td><td>{sampleReady?<input type="number" min={0} max={1023} aria-label={`Umbral ${name.toLowerCase()}`} value={Number.isNaN(calibration.thresholds[i])?'':calibration.thresholds[i]} onChange={e=>calibration.update(i,e.target.value===''?NaN:Number(e.target.value))}/>:<span className="previous-threshold">Anterior <b>{calibration.savedThresholds[i]}</b></span>}</td></tr>;})}</tbody></table>
  {calibration.ready&&<section className="threshold-learning" aria-label="Aprender a elegir el umbral">
   <div className="threshold-learning-heading"><span><Lightbulb size={14}/>3 · Elige la frontera</span><small>{names[activeSensor]}</small></div>
   <p>El umbral es el número que separa las lecturas que interpretarás como blanco y negro. Estás ajustando <strong>{names[activeSensor]}</strong>; cada sensor puede necesitar un valor distinto.</p>
   {activeReady&&<><div className="threshold-scale-labels"><span>Blanco <b>{sliderMin}</b></span><span>Negro <b>{sliderMax}</b></span></div><input className="threshold-slider" type="range" min={sliderMin} max={sliderMax} value={sliderValue} aria-label={`Umbral visual ${names[activeSensor].toLowerCase()}`} onChange={e=>calibration.update(activeSensor,Number(e.target.value))}/><div className="threshold-choice"><span>Tu umbral</span><strong>{Number.isFinite(activeThreshold)?activeThreshold:'—'}</strong><span>Sugerido: <b>{calibration.recommended[activeSensor]}</b></span></div></>}
   <button type="button" className="threshold-recommended" onClick={calibration.useRecommended}><Lightbulb size={14}/>Usar valores recomendados</button>
   {calibration.decisionMade&&Number.isFinite(activeThreshold)&&<div className="threshold-rule"><span><b>{activeThreshold}</b> o menos → blanco</span><span>más de <b>{activeThreshold}</b> → negro</span></div>}
   <button type="button" className="threshold-check" onClick={calibration.check}><ShieldCheck size={14}/>Comprobar mi umbral</button>
   {calibration.checkResult&&<div className={`threshold-check-result ${calibration.checkResult}`} role="status">{calibration.checkResult==='pass'?<><CheckCircle2 size={14}/><span>Funciona: el blanco queda a un lado del umbral y el negro al otro.</span></>:<><span aria-hidden="true">!</span><span>Revisa el valor: debe quedar entre blanco y negro.</span></>}</div>}
  </section>}
  {calibration.checkResult==='pass'&&<section className="threshold-code"><div><Code2 size={14}/><strong>5 · Úsalos en tu programa</strong></div><pre>{`const int UMBRAL_I = ${calibration.thresholds[0]};\nconst int UMBRAL_C = ${calibration.thresholds[1]};\nconst int UMBRAL_D = ${calibration.thresholds[2]};\n\nbool negroI = leerSensorLineaIzquierdo() > UMBRAL_I;\nbool negroC = leerSensorLineaCentral() > UMBRAL_C;\nbool negroD = leerSensorLineaDerecho() > UMBRAL_D;`}</pre><small>Cada sensor conserva su propia referencia. Una lectura mayor que su umbral se interpreta como negro; la lectura ADC original no cambia.</small></section>}
  <div className="calibration-footer"><div className="calibration-actions calibration-actions-simple"><button title="Volver a la zona de inicio" onClick={()=>simulation.send({type:'reset'})}><Home size={15}/>Inicio</button><button title="Borrar las muestras registradas" onClick={calibration.clear}><Trash2 size={15}/>Limpiar</button></div>
  <button className="primary save-thresholds" disabled={!calibration.canSave} onClick={()=>{const saved=calibration.save();if(saved)onSaved(saved);}}><Save size={17}/>Guardar calibración y volver</button>
  <p className={`calibration-message ${calibration.canSave?'ready':''}`} role="status">{calibration.message||(!whiteReady?'Primero registra blanco con los tres sensores.':!blackReady?'Ahora registra negro con los tres sensores.':!calibration.decisionMade?'Las mediciones están listas. Elige un umbral o usa la recomendación de BITIRO.':calibration.checkResult!=='pass'?'Comprueba tu elección antes de guardar.':'Tu umbral funciona. Observa el ejemplo de código y guarda la calibración.')}</p></div>
 </aside>;
}

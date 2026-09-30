import {useEffect,useMemo,useState} from 'react';
import {getStorageScope,scopedStorageKey} from '../code-editor/storage';
import {CheckCircle2,Copy,Minus,MousePointer2,Plus,RotateCcw,Save,ScanLine} from 'lucide-react';
import type {SimulationConnection} from './useSimulation';
import type {LineThresholds} from '../../simulator/types';

export type Thresholds=LineThresholds;
type Reading={value:number;x:number;y:number};
type Surface='white'|'black'|'edge';

const key='bitiro-s01-calibration-v1';
const REQUIRED_READINGS=3;
const MIN_SAMPLE_DISTANCE_CM=5;
const WHITE_MAX=150;
const BLACK_MIN=220;

export function loadThresholds():Thresholds{
 try{
  const value=JSON.parse(localStorage.getItem(scopedStorageKey(key))||'null');
  if(Array.isArray(value)&&value.length===3&&value.every(n=>Number.isInteger(n)&&n>=0&&n<=1023))return value as Thresholds;
 }catch{/* Keep default reference when storage is unavailable. */}
 return [200,200,200];
}

function surfaceFromReading(value:number):Surface{
 if(value<=WHITE_MAX)return 'white';
 if(value>=BLACK_MIN)return 'black';
 return 'edge';
}
function farEnough(readings:Reading[],x:number,y:number){
 return readings.every(sample=>Math.hypot(sample.x-x,sample.y-y)>=MIN_SAMPLE_DISTANCE_CM);
}

export function useCalibration(simulation:SimulationConnection,enabled:boolean){
 const [scope]=useState(getStorageScope);
 const initial=loadThresholds();
 const [whiteSamples,setWhiteSamples]=useState<Reading[]>([]),[blackSamples,setBlackSamples]=useState<Reading[]>([]);
 const [centerThreshold,setCenterThreshold]=useState(initial[1]),[savedThresholds,setSavedThresholds]=useState<Thresholds>(initial);
 const [decisionMade,setDecisionMade]=useState(false),[testedWhite,setTestedWhite]=useState(false),[testedBlack,setTestedBlack]=useState(false),[saved,setSaved]=useState(false),[message,setMessage]=useState('');
 const {robot}=simulation.snapshot;
 const current=robot.lineCenter;
 const whiteReady=whiteSamples.length>=REQUIRED_READINGS,blackReady=blackSamples.length>=REQUIRED_READINGS;
 const whiteValues=whiteSamples.map(sample=>sample.value),blackValues=blackSamples.map(sample=>sample.value);
 const whiteMax=whiteReady?Math.max(...whiteValues):null,blackMin=blackReady?Math.min(...blackValues):null;
 const rangesSeparate=whiteMax!==null&&blackMin!==null&&whiteMax<blackMin;
 const ready=whiteReady&&blackReady&&rangesSeparate;
 const thresholds=[savedThresholds[0],centerThreshold,savedThresholds[2]] as Thresholds;
 const surface=surfaceFromReading(current);
 const canCaptureWhite=!whiteReady&&surface==='white'&&farEnough(whiteSamples,robot.x,robot.y);
 const canCaptureBlack=whiteReady&&!blackReady&&surface==='black'&&farEnough(blackSamples,robot.x,robot.y);
 const checkResult=testedWhite&&testedBlack?'pass':null;
 const canSave=ready&&decisionMade&&testedWhite&&testedBlack;

 useEffect(()=>{if(simulation.engineState==='ready')simulation.send({type:'set-line-thresholds',values:savedThresholds});},[simulation.engineState,simulation.send,savedThresholds]);
 useEffect(()=>{
  if(!enabled)return;
  setMessage('');
 },[enabled]);

 function capture(kind:'white'|'black'){
  const list=kind==='white'?whiteSamples:blackSamples;
  const expected=kind;
  if(surface!==expected){
   setMessage(surface==='edge'?'El sensor central está sobre el borde. Muévelo completamente al blanco o a la línea negra.':kind==='white'?'Esta lectura parece negra. Mueve el sensor central fuera de la línea.':'Esta lectura parece blanca. Coloca el sensor central sobre la línea negra.');
   return;
  }
  if(!farEnough(list,robot.x,robot.y)){
   setMessage('Prueba en otro punto de la pista para comparar una lectura diferente.');
   return;
  }
  const next=[...list,{value:current,x:robot.x,y:robot.y}].slice(0,REQUIRED_READINGS);
  if(kind==='white'){
   setWhiteSamples(next);
   setMessage(next.length===REQUIRED_READINGS?'Blanco listo. Ahora mide la línea negra en tres lugares distintos.':`Lectura blanca ${next.length}/${REQUIRED_READINGS} registrada.`);
  }else{
   setBlackSamples(next);
   if(next.length===REQUIRED_READINGS){
    setDecisionMade(false);
    setMessage('Mediciones listas. Ahora calcula un valor que quede entre blanco y negro.');
   }else setMessage(`Lectura negra ${next.length}/${REQUIRED_READINGS} registrada.`);
  }
  setSaved(false);
 }
 function update(value:number){
  if(!Number.isFinite(value)){setMessage('Escribe un número para usarlo como umbral.');return;}
  if(whiteMax===null||blackMin===null||!ready){setMessage('Primero registra tres lecturas blancas y tres negras.');return;}
  const rounded=Math.round(value);
  if(rounded<=whiteMax||rounded>=blackMin){setMessage(`Tu umbral debe ser mayor que ${whiteMax} y menor que ${blackMin}. Vuelve a calcularlo.`);return;}
  setCenterThreshold(rounded);
  setDecisionMade(true);setTestedWhite(false);setTestedBlack(false);setSaved(false);setMessage('Umbral elegido. Ahora compruébalo sobre blanco y sobre negro.');
 }
 function testCurrent(){
  if(!ready||!decisionMade){setMessage('Primero termina las mediciones y elige tu umbral.');return;}
  if(surface==='edge'){setMessage('Estás sobre el borde de la línea. Mueve el sensor central a una zona claramente blanca o negra.');return;}
  const detected:Surface=current>=centerThreshold?'black':'white';
  if(detected!==surface){
   setMessage(`Con umbral ${centerThreshold}, esta lectura se interpreta como ${detected==='black'?'NEGRO':'BLANCO'}. Ajusta el umbral y vuelve a probar.`);
   return;
  }
  if(surface==='white')setTestedWhite(true);else setTestedBlack(true);
  const otherDone=surface==='white'?testedBlack:testedWhite;
  setMessage(otherDone?'¡Funciona! El sensor distingue correctamente blanco y negro.':'Bien. Ahora comprueba el otro color.');
  setSaved(false);
 }
 function clear(){
  setWhiteSamples([]);setBlackSamples([]);setCenterThreshold(savedThresholds[1]);setDecisionMade(false);setTestedWhite(false);setTestedBlack(false);setSaved(false);setMessage('Mediciones reiniciadas. Empieza colocando el sensor central sobre blanco.');
 }
 function save():Thresholds|null{
  if(!canSave){setMessage('Antes de guardar, prueba el umbral sobre una zona blanca y una negra.');return null;}
  const applied=[savedThresholds[0],centerThreshold,savedThresholds[2]] as Thresholds;
  try{
   localStorage.setItem(scopedStorageKey(key,scope),JSON.stringify(applied));
   setSavedThresholds(applied);simulation.send({type:'set-line-thresholds',values:applied});setSaved(true);setMessage(`Calibración guardada. Usa int umbral = ${centerThreshold}; en tu programa.`);return applied;
  }catch{setMessage(`No se pudo guardar. Anota este valor: umbral = ${centerThreshold}.`);return null;}
 }
 return {whiteSamples,blackSamples,current,surface,centerThreshold,thresholds,savedThresholds,whiteReady,blackReady,whiteMax,blackMin,ready,decisionMade,testedWhite,testedBlack,checkResult,canCaptureWhite,canCaptureBlack,canSave,saved,message,capture,update,testCurrent,clear,save};
}

function SampleDots({values,tone}:{values:Reading[];tone:'white'|'black'}){
 return <div className={`calibration-samples ${tone}`} aria-label={`${values.length} de ${REQUIRED_READINGS} lecturas registradas`}>
  {Array.from({length:REQUIRED_READINGS},(_,index)=><span key={index} className={values[index]?'filled':''}>{values[index]?values[index].value:index+1}</span>)}
 </div>;
}

export function CalibrationPanel({simulation,calibration,onSaved}:{simulation:SimulationConnection;calibration:ReturnType<typeof useCalibration>;onSaved:(values:Thresholds)=>void}){
 const activeStep=!calibration.whiteReady?1:!calibration.blackReady?2:!calibration.decisionMade?3:calibration.checkResult!=='pass'?4:5;
 const stepClass=(step:number,done:boolean)=>`${activeStep===step?'active ':''}${done?'done':''}`.trim();
 const surfaceLabel=calibration.surface==='white'?'BLANCO':calibration.surface==='black'?'NEGRO':'BORDE';
 const detectedLabel=calibration.decisionMade?(calibration.current>=calibration.centerThreshold?'NEGRO':'BLANCO'):null;
 const code=`int umbral = ${calibration.centerThreshold};`;
 const [copied,setCopied]=useState(false);
 const [thresholdDraft,setThresholdDraft]=useState('');
 useEffect(()=>{if(activeStep===3&&!calibration.decisionMade)setThresholdDraft('');},[activeStep,calibration.decisionMade]);
 const task=useMemo(()=>{
  if(activeStep===1)return {title:'Mide el blanco',text:'Pon el sensor central sobre una zona blanca. Registra 3 lecturas en lugares distintos.'};
  if(activeStep===2)return {title:'Mide la línea negra',text:'Ahora coloca el sensor central sobre la línea negra y registra 3 lecturas.'};
  if(activeStep===3)return {title:'Calcula tu umbral',text:'Usa tus mediciones para calcular un número que quede entre el blanco y el negro.'};
  if(activeStep===4)return {title:'Comprueba tu elección',text:'Mueve IROH entre blanco y negro y verifica que el sensor reconozca ambos.'};
  return {title:'Calibración lista',text:'Guarda el valor y úsalo como variable umbral en tu programa de S01.'};
 },[activeStep]);
 async function copyCode(){try{await navigator.clipboard.writeText(code);setCopied(true);window.setTimeout(()=>setCopied(false),1500);}catch{/* Clipboard can be unavailable in embedded contexts. */}}
 return <aside className="calibration-panel calibration-guide" aria-label="Calibración guiada del sensor central">
  <div className="calibration-heading"><span className="calibration-icon"><ScanLine size={18}/></span><div><span className="eyebrow">Calibración S01</span><h2>Enseña al IROH a distinguir blanco y negro.</h2></div></div>
  <div className="calibration-steps calibration-steps-five" aria-label="Pasos de calibración">
   <span className={stepClass(1,calibration.whiteReady)}><b>{calibration.whiteReady?'✓':'1'}</b>Blanco</span>
   <span className={stepClass(2,calibration.blackReady)}><b>{calibration.blackReady?'✓':'2'}</b>Negro</span>
   <span className={stepClass(3,calibration.decisionMade)}><b>{calibration.decisionMade?'✓':'3'}</b>Umbral</span>
   <span className={stepClass(4,calibration.checkResult==='pass')}><b>{calibration.checkResult==='pass'?'✓':'4'}</b>Probar</span>
   <span className={stepClass(5,calibration.saved)}><b>{calibration.saved?'✓':'5'}</b>Guardar</span>
  </div>

  <section id="calibration-instructions" className="calibration-task">
   <div className="calibration-task-number">{activeStep}</div><div><strong>{task.title}</strong><p>{task.text}</p></div>
  </section>

  <section className={`calibration-reading is-${calibration.surface}`} aria-live="polite">
   <div><span>Sensor central</span><small>{calibration.decisionMade?`Con umbral ${calibration.centerThreshold}`:'Lectura actual'}</small></div>
   <strong>{calibration.current}</strong>
   <div className="calibration-reading-state"><span>Superficie</span><b>{surfaceLabel}</b>{detectedLabel&&<small>El programa leería: {detectedLabel}</small>}</div>
  </section>

  {activeStep===1&&<section className="calibration-step-card">
   <div className="calibration-card-head"><strong>Lecturas sobre blanco</strong><span>{calibration.whiteSamples.length}/{REQUIRED_READINGS}</span></div>
   <SampleDots values={calibration.whiteSamples} tone="white"/>
   <p><MousePointer2 size={14}/>Arrastra el IROH fuera de la línea y registra una lectura. Después muévelo a otro lugar blanco.</p>
   <button className="primary calibration-main-action" disabled={!calibration.canCaptureWhite} onClick={()=>calibration.capture('white')}>Registrar lectura blanca</button>
   {calibration.surface!=='white'&&<small className="calibration-nudge">El sensor central aún no está completamente sobre blanco.</small>}
  </section>}

  {activeStep===2&&<section className="calibration-step-card">
   <div className="calibration-card-head"><strong>Lecturas sobre negro</strong><span>{calibration.blackSamples.length}/{REQUIRED_READINGS}</span></div>
   <SampleDots values={calibration.blackSamples} tone="black"/>
   <p><MousePointer2 size={14}/>Pon el sensor central sobre la línea negra. Registra y repite en otros dos puntos de la línea.</p>
   <button className="primary calibration-main-action" disabled={!calibration.canCaptureBlack} onClick={()=>calibration.capture('black')}>Registrar lectura negra</button>
   {calibration.surface!=='black'&&<small className="calibration-nudge">El sensor central aún no está completamente sobre la línea negra.</small>}
  </section>}

  {activeStep===3&&calibration.whiteMax!==null&&calibration.blackMin!==null&&<section className="calibration-step-card threshold-choice-card">
   <div className="threshold-comparison"><div><span>Mayor lectura blanca</span><strong>{calibration.whiteMax}</strong></div><div className="threshold-gap"><span>Tu respuesta debe quedar aquí</span><i/></div><div><span>Menor lectura negra</span><strong>{calibration.blackMin}</strong></div></div>
   <p><strong>Ahora te toca calcular.</strong> Elige un número mayor que {calibration.whiteMax} y menor que {calibration.blackMin}. No hay una única respuesta correcta.</p>
   <form className="threshold-student-entry" onSubmit={event=>{event.preventDefault();calibration.update(Number(thresholdDraft));}}>
    <label htmlFor="student-threshold">Escribe tu umbral</label>
    <div className="threshold-equation" aria-label={`El umbral debe ser mayor que ${calibration.whiteMax} y menor que ${calibration.blackMin}`}>
     <strong>{calibration.whiteMax}</strong><span>&lt;</span>
     <input id="student-threshold" type="number" inputMode="numeric" min={calibration.whiteMax+1} max={calibration.blackMin-1} value={thresholdDraft} placeholder="?" onChange={event=>setThresholdDraft(event.target.value)} autoComplete="off"/>
     <span>&lt;</span><strong>{calibration.blackMin}</strong>
    </div>
    <button className="primary calibration-main-action" type="submit" disabled={!thresholdDraft.trim()}>Usar mi umbral</button>
   </form>
  </section>}

  {activeStep===4&&<section className="calibration-step-card calibration-test-card">
   <div className="calibration-test-grid"><div className={calibration.testedWhite?'done':''}><span>Prueba en blanco</span>{calibration.testedWhite?<CheckCircle2 size={18}/>:<b>pendiente</b>}</div><div className={calibration.testedBlack?'done':''}><span>Prueba en negro</span>{calibration.testedBlack?<CheckCircle2 size={18}/>:<b>pendiente</b>}</div></div>
   <p>Mueve el sensor central a blanco o negro. BITIRO comprobará si tu umbral interpreta correctamente la lectura actual.</p>
   <button className="primary calibration-main-action" disabled={calibration.surface==='edge'} onClick={calibration.testCurrent}>Comprobar esta lectura</button>
   <div className="calibration-test-adjust"><span>Ajustar umbral</span><div><button aria-label="Bajar umbral en 5" onClick={()=>calibration.update(calibration.centerThreshold-5)}><Minus size={13}/></button><strong>{calibration.centerThreshold}</strong><button aria-label="Subir umbral en 5" onClick={()=>calibration.update(calibration.centerThreshold+5)}><Plus size={13}/></button></div></div>
   <div className="threshold-rule-simple"><span>Menor que {calibration.centerThreshold} → <b>BLANCO</b></span><span>{calibration.centerThreshold} o más → <b>NEGRO</b></span></div>
  </section>}

  {activeStep===5&&<section className="calibration-step-card calibration-success-card">
   <CheckCircle2 size={24}/><div><strong>Tu umbral distingue blanco y negro.</strong><p>Este es el valor que necesitas llevar al programa de la sesión.</p></div>
   <div className="calibration-code-value"><code>{code}</code><button type="button" onClick={()=>void copyCode()}><Copy size={14}/>{copied?'Copiado':'Copiar'}</button></div>
  </section>}

  {calibration.message&&<p className="calibration-guide-message" role="status">{calibration.message}</p>}

  <div className={`calibration-guide-footer ${activeStep===5?'is-ready':''}`}>
   <button className="calibration-reset" onClick={calibration.clear}><RotateCcw size={15}/>Reiniciar mediciones</button>
   {activeStep===5&&<button className="primary save-thresholds" disabled={!calibration.canSave} onClick={()=>{const saved=calibration.save();if(saved)onSaved(saved);}}><Save size={17}/>Guardar calibración y volver</button>}
  </div>
 </aside>;
}

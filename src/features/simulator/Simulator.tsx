import {Component,lazy,Suspense,useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,ArrowUp,ArrowDown,Square,Code2,MonitorPlay,FlaskConical,PanelLeftClose,PanelLeftOpen,Maximize2,Minimize2} from 'lucide-react';
import type {SessionDefinition} from '../../content/sessions';
import type {CloudContext} from '../code-editor/cloud-learning';
const CodeEditor=lazy(()=>import('../code-editor/CodeEditor').then(m=>({default:m.CodeEditor})));
import {Arena} from './Arena';
import {Arena3D} from './Arena3D';
import {MissionPanel} from './MissionPanel';
import {useSimulation,type SimulationConnection} from './useSimulation';
import {TelemetryPanel} from './TelemetryPanel';
import {RuntimeBar} from './RuntimeBar';
import {FeedbackPanel} from './FeedbackPanel';
import {CalibrationPanel,useCalibration} from './CalibrationPanel';
import {SimulatorToolbar} from './SimulatorToolbar';
import {hasSimulation} from '../../content/tracks';
function SimulatorPanel({simulation,cloudContext,onCalibrationModeChange}:{simulation:SimulationConnection;cloudContext?:CloudContext;onCalibrationModeChange?:(active:boolean)=>void}){
 const track=simulation.track;
 const debug=new URLSearchParams(location.search).get('debug')==='1';
 const [calibrating,setCalibrating]=useState(false),[zoom,setZoom]=useState(1),[calibrationNotice,setCalibrationNotice]=useState('');
 const [viewMode,setViewMode]=useState<'top'|'perspective'|'follow'>('perspective');
 const [nativeFullscreen,setNativeFullscreen]=useState(false),[fullscreenFallback,setFullscreenFallback]=useState(false),panelRef=useRef<HTMLElement>(null);
 const fullscreen=nativeFullscreen||fullscreenFallback;
 const calibration=useCalibration(simulation,calibrating),{robot}=simulation.snapshot;
 const calibrationZoom=.9;
 const viewportZoom=calibrating?calibrationZoom:zoom;
 const is3D=!calibrating&&viewMode!=='top';
 useEffect(()=>{if(simulation.reviewState==='Ejecutando')setCalibrating(false);},[simulation.reviewState]);
 useEffect(()=>{onCalibrationModeChange?.(calibrating);},[calibrating,onCalibrationModeChange]);
 useEffect(()=>{
  const sync=()=>setNativeFullscreen(document.fullscreenElement===panelRef.current);
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&fullscreenFallback){event.preventDefault();setFullscreenFallback(false);}};
  document.addEventListener('fullscreenchange',sync);window.addEventListener('keydown',onKey);sync();
  return()=>{document.removeEventListener('fullscreenchange',sync);window.removeEventListener('keydown',onKey);};
 },[fullscreenFallback]);
 useEffect(()=>{
  if(!fullscreenFallback)return;
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous;};
 },[fullscreenFallback]);
 async function togglePanelFullscreen(){
  const element=panelRef.current;if(!element)return;
  if(document.fullscreenElement===element){try{await document.exitFullscreen();}finally{setFullscreenFallback(false);}return;}
  if(fullscreenFallback){setFullscreenFallback(false);return;}
  try{if(typeof element.requestFullscreen==='function'){await element.requestFullscreen();if(document.fullscreenElement===element)return;}}catch{/* fallback below */}
  setFullscreenFallback(true);
 }
 function toggleCalibration(){if(!calibrating){setViewMode('top');setCalibrationNotice('');}if(!calibrating){simulation.send({type:'stop-program'});setZoom(1);}setCalibrating(!calibrating);}
 function finishCalibration(values:import('../../simulator/types').LineThresholds){simulation.send({type:'reset'});setCalibrating(false);setViewMode('perspective');setZoom(1);setCalibrationNotice(`Calibración guardada · umbral central ${values[1]}`);window.setTimeout(()=>setCalibrationNotice(''),4500);}
 return <section ref={panelRef} className={`simulation-panel ${calibrating?'is-calibrating':''} ${is3D?'is-3d-view':'is-2d-view'} ${fullscreenFallback?'is-panel-fullscreen':''}`} aria-label={`Simulador ${track.id.toUpperCase()}`}>
  {simulation.engineState!=='ready'&&<div className="engine-notice" role="status"><p>{simulation.engineState==='starting'?'Iniciando motor…':simulation.engineError}</p>{simulation.engineState==='error'&&<button onClick={simulation.retry}>Reiniciar motor</button>}</div>}
  <SimulatorToolbar zoom={viewportZoom} onZoom={setZoom} calibration={calibrating} onCalibration={toggleCalibration} trackId={track.id} viewMode={calibrating?'top':viewMode} onViewMode={mode=>{setViewMode(mode);if(mode==='top')setZoom(1);}} fullscreen={fullscreen} onFullscreen={()=>void togglePanelFullscreen()}/>
  {calibrating&&<div className="calibration-banner"><FlaskConical size={15}/><span><strong>Modo calibración</strong> · mide blanco, mide negro y construye el umbral del sensor central.</span></div>}{!calibrating&&calibrationNotice&&<div className="calibration-applied-banner" role="status"><FlaskConical size={15}/><span>{calibrationNotice}</span></div>}
  <div className="simulation-body"><div className="viewport-column">{is3D?<Arena3D snapshot={simulation.snapshot} track={track} zoom={zoom} onZoom={setZoom} thresholds={calibration.savedThresholds} preset={viewMode==='follow'?'follow':'perspective'}/>:<Arena latest={simulation.latest} calibration={calibrating} send={simulation.send} zoom={viewportZoom} activeSensor={1} thresholds={calibration.thresholds} snapshot={simulation.snapshot} running={simulation.snapshot.status==='running'} track={track}/>} {debug&&<div className="debug"><p data-testid="robot-position">x={robot.x.toFixed(3)} y={robot.y.toFixed(3)} θ={robot.heading.toFixed(3)}</p><span>Ticks: {simulation.snapshot.ticks} · Colisiones: {simulation.snapshot.collisions}</span></div>}</div>{calibrating?<CalibrationPanel simulation={simulation} calibration={calibration} onSaved={finishCalibration}/>:<TelemetryPanel simulation={simulation}/>}</div>
  {!calibrating&&<RuntimeBar simulation={simulation}/>} 
  {debug&&<div className="manual-controls" aria-label="Motores de diagnóstico"><span>Diagnóstico</span><button aria-label="Girar izquierda manual" onClick={()=>simulation.send({type:'motors',left:-14,right:14})}><ArrowLeft size={16}/></button><button aria-label="Avanzar manual" onClick={()=>simulation.send({type:'motors',left:18,right:18})}><ArrowUp size={16}/></button><button aria-label="Girar derecha manual" onClick={()=>simulation.send({type:'motors',left:14,right:-14})}><ArrowRight size={16}/></button><button aria-label="Retroceder manual" onClick={()=>simulation.send({type:'motors',left:-14,right:-14})}><ArrowDown size={16}/></button><button aria-label="Detener manual" onClick={()=>simulation.send({type:'stop'})}><Square size={16}/></button></div>}
  {!calibrating&&<FeedbackPanel simulation={simulation} calibration={false}/>}
  {!calibrating&&<MissionPanel evidence={simulation.snapshot.mission} cloudContext={cloudContext}/>} 
 </section>;
}
type WorkspaceProps={session:SessionDefinition;storageScope?:string;cloudContext?:CloudContext;mentorMode?:boolean};
class EditorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<section className="editor-recovery" role="alert"><h2>No pudimos cargar el editor</h2><p>El documento guardado permanece en este navegador.</p><button onClick={()=>location.reload()}>Reintentar carga</button></section>:this.props.children;}
}
function Workspace({session,simulation,storageScope,cloudContext,mentorMode=false}:{simulation?:SimulationConnection}&WorkspaceProps){
 const [tab,setTab]=useState('simulator');
 const [calibrationMode,setCalibrationMode]=useState(false);
 const [focus,setFocus]=useState(()=>{try{return sessionStorage.getItem('bitiro:sim-focus')==='1';}catch{return false;}});
 const [nativeFullscreen,setNativeFullscreen]=useState(false),[fullscreenFallback,setFullscreenFallback]=useState(false),workspaceRef=useRef<HTMLElement>(null);
 const fullscreen=nativeFullscreen||fullscreenFallback;
 useEffect(()=>{try{sessionStorage.setItem('bitiro:sim-focus',focus?'1':'0');}catch{/* unavailable in private storage */}},[focus]);
 useEffect(()=>{if(!calibrationMode)return;setTab('simulator');},[calibrationMode]);
 useEffect(()=>{
  const sync=()=>setNativeFullscreen(document.fullscreenElement===workspaceRef.current);
  const toggle=(event:KeyboardEvent)=>{
   if(event.ctrlKey&&event.key==='\\'&&!event.repeat){event.preventDefault();setFocus(v=>!v);setTab('simulator');return;}
   if(event.key==='Escape'&&fullscreenFallback){event.preventDefault();setFullscreenFallback(false);}
  };
  document.addEventListener('fullscreenchange',sync);window.addEventListener('keydown',toggle);
  sync();
  return()=>{document.removeEventListener('fullscreenchange',sync);window.removeEventListener('keydown',toggle);};
 },[fullscreenFallback]);
 useEffect(()=>{
  if(!fullscreenFallback)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous;};
 },[fullscreenFallback]);
 async function toggleFullscreen(){
  const element=workspaceRef.current;if(!element)return;
  if(document.fullscreenElement===element){
   try{await document.exitFullscreen();}finally{setFullscreenFallback(false);}
   return;
  }
  if(fullscreenFallback){setFullscreenFallback(false);return;}
  try{
   if(typeof element.requestFullscreen==='function'){
    await element.requestFullscreen();
    if(document.fullscreenElement===element)return;
   }
  }catch{/* Browser or embedded context may reject the native Fullscreen API. */}
  setFullscreenFallback(true);
 }
 
 const simRef=useRef<HTMLDivElement>(null),editorRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const state=simulation?.reviewState;
  if(state==='Ejecutando'){
    setTab('simulator');
    // Once the source is accepted and execution really starts, return the student
    // to the simulator automatically on every screen size. If review fails we keep
    // the editor in view so the diagnostic can be corrected without losing context.
    const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
    requestAnimationFrame(()=>simRef.current?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'}));
  }
  else if(state==='Error'){
    setTab('editor');
    if(matchMedia('(max-width:767px)').matches)editorRef.current?.scrollIntoView({block:'start'});
  }
 },[simulation?.reviewState]);
 return <main id="main" ref={workspaceRef} className={`workspace ${focus&&simulation?'is-simulation-focused':''} ${calibrationMode?'is-calibration-workspace':''} ${fullscreenFallback?'is-lab-fullscreen':''}`}>
  <div className="workspace-heading"><div><span className="eyebrow">Misión {String(session.number).padStart(2,'0')} · Robótica Intermedia</span><h1>{session.title}</h1></div><div className="workspace-view-actions">{(calibrationMode||!simulation)&&<span className="workspace-availability">{calibrationMode?'Modo calibración activo':'Material y editor'}</span>}{simulation&&<>{!calibrationMode&&<button type="button" className="button workspace-focus-button" aria-pressed={focus} onClick={()=>{setFocus(v=>!v);setTab('simulator');}}>{focus?<PanelLeftOpen size={16}/>:<PanelLeftClose size={16}/>} {focus?'Mostrar código':'Ocultar código'}</button>}<button type="button" className="button workspace-fullscreen-button" aria-label={fullscreen?'Salir de pantalla completa':'Pantalla completa del laboratorio'} onClick={()=>void toggleFullscreen()}>{fullscreen?<Minimize2 size={16}/>:<Maximize2 size={16}/>} <span>{fullscreen?'Salir de pantalla completa':'Pantalla completa'}</span></button></>}</div></div>
  <div className="workspace-tabs" aria-label="Vista de trabajo"><button aria-pressed={tab==='editor'} onClick={()=>setTab('editor')} disabled={calibrationMode}><Code2 size={18}/>Código</button><button aria-pressed={tab==='simulator'} onClick={()=>setTab('simulator')}><MonitorPlay size={18}/>{simulation?'Simulador':'Material'}</button></div>
  <div className={`workspace-grid workspace-grid-stacked show-${calibrationMode||focus&&simulation?'simulator':tab}`}>
   <div ref={simRef} className="simulation-column">{simulation?<SimulatorPanel simulation={simulation} cloudContext={cloudContext} onCalibrationModeChange={setCalibrationMode}/>:<section className="session-overview"><span className="eyebrow">Material y editor</span><h2>Prepara tu próxima misión.</h2><p>{session.summary}</p><div className="overview-track">{session.trackAsset?<img src={session.trackAsset} alt={`Plotter ${session.id.toUpperCase()}`}/>:<strong>Material institucional aún no publicado en BITIRO</strong>}</div><ol>{session.objectives.map(o=><li key={o}>{o}</li>)}</ol><p className="availability-note">La simulación de esta sesión aún no está disponible. Puedes consultar el material y preparar tu código.</p></section>}</div>
   <div ref={editorRef} className="editor-column" aria-hidden={calibrationMode||focus&&!!simulation?true:undefined}><div className="workspace-editor-heading"><div><span className="eyebrow">Programación</span><strong>Programa el IROH y prueba tu solución</strong></div><span>Arduino / C++</span></div><EditorBoundary><Suspense fallback={<section className="editor-skeleton" role="status"><Code2 size={24}/><h2>Preparando el editor</h2><p>Ya puedes explorar la pista y los objetivos.</p></section>}><CodeEditor session={session} simulation={simulation} storageScope={storageScope} cloudContext={cloudContext} mentorMode={mentorMode}/></Suspense></EditorBoundary></div>
  </div>
 </main>;
}
function LiveWorkspace(props:WorkspaceProps){const simulation=useSimulation(props.session.id);return <Workspace {...props} simulation={simulation}/>;}
export function Simulator(props:WorkspaceProps){return hasSimulation(props.session.id)?<LiveWorkspace {...props}/>:<Workspace {...props}/>;}

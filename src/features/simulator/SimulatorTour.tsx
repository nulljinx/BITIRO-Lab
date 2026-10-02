import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,ArrowRight,BookOpen,Check,Compass,Eye,Gauge,Play,SlidersHorizontal,Code2,X} from 'lucide-react';

type TourArea='simulator'|'editor';
type TourStep={
 title:string;
 body:string;
 target?:string;
 area:TourArea;
 icon:typeof Compass;
};

const STEPS:TourStep[]=[
 {
  title:'Bienvenido al laboratorio BITIRO',
  body:'Aquí escribes tu programa y observas cómo responde el IROH. Este recorrido rápido te mostrará las herramientas principales. Solo aparecerá automáticamente la primera vez.',
  area:'simulator',icon:Compass,
 },
 {
  title:'La Guía está siempre disponible',
  body:'Si olvidas un concepto, una condición o una función del IROH, abre “Guía”. Allí encontrarás los contenidos de la sesión y una referencia de funciones para consultar sin salir del laboratorio.',
  target:'guide',area:'simulator',icon:BookOpen,
 },
 {
  title:'Explora la pista',
  body:'Esta es la pista de la misión. En 3D puedes arrastrar para orbitar y usar la rueda para acercarte o alejarte. Cuando ejecutes tu código, aquí verás el recorrido del IROH.',
  target:'viewport',area:'simulator',icon:Eye,
 },
 {
  title:'Controla la vista',
  body:'Desde esta barra puedes cambiar entre vista superior, perspectiva y seguimiento del IROH, ajustar el zoom, entrar a pantalla completa y abrir la calibración.',
  target:'simulator-toolbar',area:'simulator',icon:Gauge,
 },
 {
  title:'Observa sensores y estados',
  body:'Este panel muestra solo los sensores y controles útiles para la sesión actual. Las lecturas de línea aparecen mientras el programa está ejecutándose.',
  target:'telemetry',area:'simulator',icon:Gauge,
 },
 {
  title:'Escribe tu programa',
  body:'En el editor trabajas con el código Arduino/IROH de la misión. Tu copia se guarda localmente mientras escribes para que puedas volver a ella después.',
  target:'editor',area:'editor',icon:Code2,
 },
 {
  title:'Revisa y prueba',
  body:'“Revisar código” busca errores sin iniciar la misión. “Probar código” carga tu programa en el simulador y te lleva a observar inmediatamente el comportamiento del IROH.',
  target:'run-code',area:'editor',icon:Play,
 },
 {
  title:'Calibra los sensores',
  body:'Usa Calibrar cuando necesites medir blanco y negro y construir tus umbrales. Cada sesión muestra solo la calibración que corresponde a lo aprendido.',
  target:'calibrate',area:'simulator',icon:SlidersHorizontal,
 },
 {
  title:'Comprueba los objetivos',
  body:'Aquí puedes revisar qué debe cumplir la misión. El progreso se actualiza mientras pruebas tu programa. Ya estás listo para trabajar; puedes volver a abrir este tutorial desde el botón “Tutorial”.',
  target:'mission',area:'simulator',icon:Check,
 },
];

function visibleTarget(name:string){
 const nodes=[...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)];
 return nodes.find(node=>{
  const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
  return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>2&&rect.height>2;
 })??null;
}

export function SimulatorTour({open,onDone,onAreaChange}:{open:boolean;onDone:()=>void;onAreaChange:(area:TourArea)=>void}){
 const [index,setIndex]=useState(0);
 const [rect,setRect]=useState<DOMRect|null>(null);
 const step=STEPS[index];
 const position=useMemo(()=>!rect?'center':rect.top+rect.height/2>window.innerHeight*.56?'top':'bottom',[rect]);

 useEffect(()=>{if(open)setIndex(0);},[open]);
 useEffect(()=>{
  if(!open)return;
  onAreaChange(step.area);
  let target:HTMLElement|null=null;
  let timer=0;
  const update=()=>{
   if(!step.target){setRect(null);return;}
   target=visibleTarget(step.target);
   if(!target){setRect(null);return;}
   const r=target.getBoundingClientRect();
   setRect(r);
  };
  const reveal=()=>{
   if(!step.target){setRect(null);return;}
   target=visibleTarget(step.target);
   if(!target){setRect(null);return;}
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center',inline:'nearest'});
   timer=window.setTimeout(update,reduced?20:260);
  };
  timer=window.setTimeout(reveal,70);
  window.addEventListener('resize',update);
  window.addEventListener('scroll',update,true);
  return()=>{window.clearTimeout(timer);window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
 },[open,index,step.area,step.target,onAreaChange]);
 useEffect(()=>{
  if(!open)return;
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onDone();}if(event.key==='ArrowRight')setIndex(value=>Math.min(STEPS.length-1,value+1));if(event.key==='ArrowLeft')setIndex(value=>Math.max(0,value-1));};
  window.addEventListener('keydown',key);
  return()=>window.removeEventListener('keydown',key);
 },[open,onDone]);
 if(!open)return null;
 const Icon=step.icon;
 const pad=8;
 return createPortal(<div className={`sim-tour-root ${rect?'has-target':'no-target'}`} role="dialog" aria-modal="true" aria-labelledby="sim-tour-title">
  <div className="sim-tour-guard" aria-hidden="true"/>
  {rect&&<div className="sim-tour-spotlight" aria-hidden="true" style={{left:Math.max(8,rect.left-pad),top:Math.max(8,rect.top-pad),width:Math.min(window.innerWidth-16,rect.width+pad*2),height:Math.min(window.innerHeight-16,rect.height+pad*2)}}/>}
  <section className={`sim-tour-card is-${position}`}>
   <div className="sim-tour-card-head"><span className="sim-tour-icon"><Icon size={20}/></span><div><span className="sim-tour-step">Paso {index+1} de {STEPS.length}</span><h2 id="sim-tour-title">{step.title}</h2></div><button type="button" className="icon-button sim-tour-close" aria-label="Cerrar tutorial" onClick={onDone}><X size={18}/></button></div>
   <p>{step.body}</p>
   <div className="sim-tour-progress" aria-label={`Paso ${index+1} de ${STEPS.length}`}>{STEPS.map((_,i)=><i key={i} className={i===index?'is-current':i<index?'is-done':''}/>)}</div>
   <div className="sim-tour-actions"><button type="button" className="sim-tour-skip" onClick={onDone}>Omitir tutorial</button><div><button type="button" disabled={index===0} onClick={()=>setIndex(value=>Math.max(0,value-1))}><ArrowLeft size={15}/>Anterior</button>{index<STEPS.length-1?<button type="button" className="primary" onClick={()=>setIndex(value=>Math.min(STEPS.length-1,value+1))}>Siguiente<ArrowRight size={15}/></button>:<button type="button" className="primary" onClick={onDone}><Check size={15}/>Comenzar</button>}</div></div>
  </section>
 </div>,document.body);
}

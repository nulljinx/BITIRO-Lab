import {Box,GitBranch,RotateCcw,Trash2,CheckCircle2,MousePointer2} from 'lucide-react';
import type {Point} from '../../simulator/types';

export type S03Tool='obstacle'|'intersection';
export const S03_SUGGESTED={
 obstacles:[{x:16.8,y:59.5},{x:65.3,y:171.7},{x:89.1,y:33.2}] satisfies Point[],
 intersections:[{x:26.1,y:106.0},{x:87.9,y:128.9},{x:26.9,y:12.3}] satisfies Point[],
};

export function S03ScenarioPanel({tool,onTool,obstacles,intersections,onSuggested,onClear,onReady}:{tool:S03Tool;onTool:(tool:S03Tool)=>void;obstacles:Point[];intersections:Point[];onSuggested:()=>void;onClear:()=>void;onReady:()=>void}){
 const ready=obstacles.length===3&&intersections.length===3;
 return <aside className="s03-scenario-panel" aria-label="Preparación del desafío S03">
  <div className="s03-scenario-heading"><span className="eyebrow">PREPARAR DESAFÍO</span><h2>Ubica los eventos de la pista.</h2><p>La evaluación de la sesión usa <strong>3 obstáculos</strong> y <strong>3 intersecciones</strong>. Puedes distribuirlos en distintos lugares del recorrido.</p></div>
  <div className="s03-progress-grid">
   <div className={obstacles.length===3?'is-complete':''}><Box size={17}/><span>Obstáculos</span><strong>{obstacles.length}/3</strong></div>
   <div className={intersections.length===3?'is-complete':''}><GitBranch size={17}/><span>Intersecciones</span><strong>{intersections.length}/3</strong></div>
  </div>
  <div className="s03-toolbox" role="group" aria-label="Elemento que quieres colocar">
   <button className={tool==='obstacle'?'is-active':''} onClick={()=>onTool('obstacle')}><Box size={16}/><span>Colocar obstáculo</span><small>{obstacles.length<3?'Haz clic en la pista':'3/3 ubicados'}</small></button>
   <button className={tool==='intersection'?'is-active':''} onClick={()=>onTool('intersection')}><GitBranch size={16}/><span>Colocar intersección</span><small>{intersections.length<3?'Haz clic sobre la línea':'3/3 ubicadas'}</small></button>
  </div>
  <div className="s03-placement-note"><MousePointer2 size={16}/><p><strong>Haz clic directamente sobre la pista.</strong> BITIRO irá numerando los elementos. Las intersecciones conviene ubicarlas sobre la línea negra.</p></div>
  <div className="s03-scenario-actions"><button onClick={onSuggested}><RotateCcw size={15}/>Distribución sugerida</button><button onClick={onClear}><Trash2 size={15}/>Limpiar</button></div>
  <button className="s03-ready" disabled={!ready} onClick={onReady}><CheckCircle2 size={17}/>{ready?'Desafío listo · ir al simulador':'Ubica los 6 elementos para continuar'}</button>
  <p className="s03-scenario-footnote">Los obstáculos de esta práctica se usan como objetivos de detección del sonar. La misión evalúa el comportamiento del programa, no una única distribución.</p>
 </aside>;
}

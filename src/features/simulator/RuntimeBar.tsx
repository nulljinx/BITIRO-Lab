import {RotateCcw,Pause,Play,Gauge,Square,CheckCircle2} from 'lucide-react';
import {useState} from 'react';
import type {SimulationConnection} from './useSimulation';
import {StatusBadge} from './TelemetryPanel';
export function RuntimeBar({simulation}:{simulation:SimulationConnection}){
 const [speed,setSpeed]=useState(1);const {robot,status}=simulation.snapshot;
 const busy=['Revisando','Cargando programa…'].includes(simulation.reviewState);
 const canReset=simulation.programLoaded&&simulation.engineState==='ready'&&!busy;
 const canRunLoaded=canReset&&(status==='idle'||status==='finished'||status==='error');
 return <div className={`runtime-bar runtime-${status}`}>
  <div className="runtime-actions">
   {canRunLoaded&&<button className="run-loaded-button" title="Volver al inicio y ejecutar otra vez el mismo programa" onClick={simulation.runLoadedProgram}><Play size={15}/><span>Probar otra vez</span></button>}
   <button className="reset-scene-button" title={canReset?'Volver al inicio y dejar IR y pulsador apagados':'Primero prueba tu código'} disabled={!canReset} onClick={simulation.resetTrial}><RotateCcw size={15}/><span>Restablecer</span></button>
   <label title="Velocidad de simulación"><Gauge size={15}/><span className="sr-only">Velocidad</span><select aria-label="Velocidad" value={speed} onChange={e=>{setSpeed(Number(e.target.value));simulation.send({type:'speed',value:Number(e.target.value)});}}><option value="0.5">0,5×</option><option value="1">1×</option><option value="2">2×</option></select></label>
   {(status==='running'||status==='paused')&&<button onClick={()=>simulation.send({type:status==='paused'?'resume':'pause'})}>{status==='paused'?<Play size={15}/>:<Pause size={15}/>}<span>{status==='paused'?'Continuar':'Pausar'}</span></button>}
   {(status==='running'||status==='paused')&&<button onClick={()=>simulation.send({type:'stop-program'})} aria-label="Detener la prueba"><Square size={15}/><span>Detener</span></button>}
  </div>
  <div className="runtime-clock">{simulation.programLoaded&&<span className="runtime-loaded" title="Puedes repetir esta prueba sin volver al editor"><CheckCircle2 size={13}/>Programa listo</span>}<StatusBadge status={status}/><time>{(robot.simTimeMs/1000).toFixed(1)} s</time></div>
 </div>;
}

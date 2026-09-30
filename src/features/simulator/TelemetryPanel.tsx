import {useEffect,useRef,useState} from 'react';
import {ScanLine,Radar,Monitor,CircleDot,Activity,X,Radio,Disc3} from 'lucide-react';
import type {RobotState,Status} from '../../simulator/types';
import type {SimulationConnection} from './useSimulation';

export const statusNames:Record<Status,string>={idle:'Detenido',running:'Ejecutando',paused:'En pausa',error:'Error',compiling:'Revisando',finished:'Terminado'};
export function StatusBadge({status}:{status:Status}){return <span className={`status-badge status ${status}`}><i/>{statusNames[status]}</span>;}
export function SensorValue({label,name,value}:{label:string;name:string;value:number|string}){return <div className="sensor-value" title={name}><span>{label}</span><strong key={value} className="sensor-reading">{value}</strong></div>;}
export function LCDDisplay({robot}:{robot:RobotState}){return <section className="hud-section lcd-section"><div className="hud-label"><span><Monitor size={15}/>LCD</span><code>16 × 2</code></div><div role="group" aria-label={`LCD ${robot.lcdBacklight?'encendida':'apagada'}`}><pre data-testid="lcd" className={`lcd ${robot.lcdBacklight?'lcd-on':'lcd-off'}`}>{robot.lcd.join('\n')}</pre></div></section>;}

export function RobotHUD({simulation}:{simulation:SimulationConnection}){
 const {robot,status}=simulation.snapshot;
 const sensorsLive=status==='running';
 const displayedLineLeft=sensorsLive?robot.lineLeft:0;
 const displayedLineCenter=sensorsLive?robot.lineCenter:0;
 const displayedLineRight=sensorsLive?robot.lineRight:0;
 const isS01=simulation.track.id==='s01';
 const isS02=simulation.track.id==='s02';
 const s02Selection=isS02?(robot.irLeft&&robot.irRight?'Base 3':robot.irRight?'Base 1':robot.irLeft?'Base 2':null):null;
 return <div className="robot-hud">
  <div className="hud-heading"><div><span className="hud-kicker">Robot</span><strong><Activity size={15}/>IROH</strong></div><StatusBadge status={status}/></div>
  <section className={`hud-section line-section ${isS01?'is-center-only':''}`}><div className="hud-label"><span><ScanLine size={15}/>{isS01?'Sensor de línea central':'Sensores de línea'}</span><code>ADC</code></div><div className="line-values">{isS01?<SensorValue label="C" name="Centro" value={displayedLineCenter}/>:<><SensorValue label="L" name="Izquierdo" value={displayedLineLeft}/><SensorValue label="C" name="Centro" value={displayedLineCenter}/><SensorValue label="R" name="Derecho" value={displayedLineRight}/></>}</div></section>
  <div className={`hud-control-grid ${isS01?'is-single':''}`}>
   {!isS01&&<section className="hud-section hud-card sonar-section"><div className="hud-label"><span><Radar size={15}/>Sonar</span><code>cm</code></div><div className="sonar-reading"><Radio size={17}/><strong>—</strong><span>Muéstralo en LCD</span></div></section>}
   <section className="hud-section hud-card actuator-section"><div className="hud-label"><span><CircleDot size={15}/>Pulsador</span></div><button className="button-sensor" aria-pressed={robot.buttonPressed} onClick={()=>simulation.send({type:'button',value:!robot.buttonPressed})}><span>{robot.buttonPressed?'Presionado':'Libre'}</span><strong>{robot.buttonPressed?'ON':'OFF'}</strong></button><div className="servo-state"><span>Golpe</span><strong>{robot.strikeServoPosition===0?'Centro':robot.strikeServoPosition===1?'Derecha':'Izquierda'} · {Math.round(robot.strikeServoAngle)}°</strong></div></section>
  </div>
  <section className="hud-section ir-section"><div className="hud-label"><span><Disc3 size={15}/>Estímulo IR</span></div>{isS02&&<div className={`s02-ir-guide ${s02Selection?'is-ready':'is-pending'}`}><span>Escenario S02</span><strong>{s02Selection??'Elige una señal'}</strong><small>DER → Base 1 · IZQ → Base 2 · ambos → Base 3</small></div>}<div className="ir-buttons">{(['left','right'] as const).map(side=>{const active=side==='left'?robot.irLeft:robot.irRight;return <button key={side} aria-label={`IR ${side==='left'?'izquierdo':'derecho'}`} aria-pressed={active} onClick={()=>simulation.send({type:'ir',side,value:!active})}><i className={active?'on':''}/><span className="ir-name">{side==='left'?'IZQ':'DER'}</span><span>{active?'Activo':'Libre'}</span></button>;})}</div></section>
  <LCDDisplay robot={robot}/>
 </div>;
}

function TelemetrySheet({simulation,onClose}:{simulation:SimulationConnection;onClose:()=>void}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);return <dialog ref={ref} className="telemetry-sheet" onCancel={onClose} aria-labelledby="telemetry-title" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="sheet-handle" aria-hidden="true"/><div className="sheet-heading"><h2 id="telemetry-title">Telemetría del IROH</h2><button className="icon-button" aria-label="Cerrar telemetría" onClick={onClose}><X size={20}/></button></div><RobotHUD simulation={simulation}/></dialog>;}
export function TelemetryPanel({simulation}:{simulation:SimulationConnection}){const [open,setOpen]=useState(false);return <><aside className="telemetry-panel" aria-label="Inspector del robot"><RobotHUD simulation={simulation}/></aside><button className="telemetry-trigger secondary" onClick={()=>setOpen(true)}><Activity size={18}/>Sensores y telemetría<StatusBadge status={simulation.snapshot.status}/></button>{open&&<TelemetrySheet simulation={simulation} onClose={()=>setOpen(false)}/>}</>;}

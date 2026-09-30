import { useEffect, useRef, useState } from 'react';
import type { RefObject, PointerEvent as ReactPointerEvent } from 'react';
import type { Snapshot, WorkerCommand, TrackDefinition, Point } from '../../simulator/types';
import { renderCanvas } from '../../simulator/renderer/CanvasRenderer';
import { ROBOT } from '../../simulator/config';
import {viewportTransform} from '../../simulator/renderer/viewport';
import type {Thresholds} from './CalibrationPanel';
import {withScenarioIntersections} from '../../simulator/scenario';

type Send = (command: WorkerCommand) => void;

export function Arena({latest,calibration,send,zoom,activeSensor,thresholds,running,snapshot,track,scenarioPlacement=false,onScenarioPlace}:{latest:RefObject<Snapshot>;calibration:boolean;send:Send;zoom:number;activeSensor:number;thresholds:Thresholds;running:boolean;snapshot:Snapshot;track:TrackDefinition;scenarioPlacement?:boolean;onScenarioPlace?:(point:Point)=>void}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const [dragging,setDragging]=useState(false);

  const displayed=useRef({...latest.current.robot});
  const [size,setSize]=useState({width:0,height:0});
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    const observer=new ResizeObserver(entries=>{const rect=entries[0].contentRect;setSize({width:rect.width,height:rect.height});});
    observer.observe(el);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    let frame=0;const started=performance.now(),from={...displayed.current};
    const render=()=>{
      if(!canvas.current||document.hidden||size.width===0||size.height===0)return;
      const current=latest.current;
      const t=running?Math.min(1,(performance.now()-started)/100):1;
      const angle=Math.atan2(Math.sin(current.robot.heading-from.heading),Math.cos(current.robot.heading-from.heading));
      displayed.current={...current.robot,x:from.x+(current.robot.x-from.x)*t,y:from.y+(current.robot.y-from.y)*t,heading:from.heading+angle*t};
      renderCanvas(canvas.current,withScenarioIntersections({...track,obstacles:current.obstacles},current.scenarioIntersections),displayed.current,calibration,zoom,activeSensor,thresholds,size);
      if(running&&t<1)frame=requestAnimationFrame(render);
    };
    const onVisibility=()=>{cancelAnimationFrame(frame);render();};
    render();document.addEventListener('visibilitychange',onVisibility);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',onVisibility);};
  },[snapshot,latest,calibration,zoom,activeSensor,thresholds,running,size,track]);

  function pointerToTrack(event:ReactPointerEvent<HTMLCanvasElement>){
    const el=canvas.current;if(!el)return null;
    const rect=el.getBoundingClientRect();
    const {scale,offsetX,offsetY}=viewportTransform(rect.width,rect.height,track,zoom,calibration?4.6:Infinity);
    return {
      x:Math.max(ROBOT.radiusCm,Math.min(track.physicalWidthCm-ROBOT.radiusCm,(event.clientX-rect.left-offsetX)/scale)),
      y:Math.max(ROBOT.radiusCm,Math.min(track.physicalHeightCm-ROBOT.radiusCm,(event.clientY-rect.top-offsetY)/scale)),
    };
  }
  function place(event:ReactPointerEvent<HTMLCanvasElement>){
    const point=pointerToTrack(event);if(!point)return;
    if(scenarioPlacement){onScenarioPlace?.(point);return;}
    if(!calibration)return;
    send({type:'pose',x:point.x,y:point.y,heading:latest.current.robot.heading});
  }
  function down(event:ReactPointerEvent<HTMLCanvasElement>){
    if(!calibration&&!scenarioPlacement)return;event.currentTarget.setPointerCapture(event.pointerId);setDragging(true);place(event);
  }
  function move(event:ReactPointerEvent<HTMLCanvasElement>){if(calibration&&dragging)place(event);}
  function up(event:ReactPointerEvent<HTMLCanvasElement>){if(!calibration&&!scenarioPlacement)return;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);setDragging(false);}

  return <div className={`arena ${calibration?'calibration-enabled':''} ${scenarioPlacement?'scenario-placement-enabled':''} ${dragging?'dragging':''} ${running?'is-running':''}`}>
    

    <canvas ref={canvas} role="img" aria-describedby={calibration?'calibration-instructions':undefined} aria-label={`Pista interactiva ${track.id.toUpperCase()} con robot IROH`}
      tabIndex={calibration?0:-1} onKeyDown={event=>{if(!calibration||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const step=event.shiftKey?5:1,robot=latest.current.robot;send({type:'pose',x:robot.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),y:robot.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0),heading:robot.heading});}}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}/>
    <span className="arena-note">{scenarioPlacement?'Haz clic sobre la pista para ubicar el elemento seleccionado':calibration?'Arrastra IROH · flechas = ajuste fino':'Vista superior · escala en centímetros'}</span>
  </div>;
}

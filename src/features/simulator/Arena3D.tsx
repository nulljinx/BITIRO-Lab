import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import type {Snapshot,TrackDefinition,LineThresholds} from '../../simulator/types';
import {renderScene3D,type SceneCamera} from '../../simulator/renderer/Scene3D';
import {withScenarioIntersections} from '../../simulator/scenario';

const PERSPECTIVE_CAMERA:SceneCamera={azimuth:-1.02,elevation:.64,distance:1.88,follow:false};
const TOP_CAMERA:SceneCamera={azimuth:-Math.PI/2,elevation:Math.PI/2-.012,distance:2.38,follow:false};
const FOLLOW_CAMERA:SceneCamera={azimuth:-1.10,elevation:.50,distance:.78,follow:true};
export function Arena3D({snapshot,track,zoom,onZoom,thresholds}:{snapshot:Snapshot;track:TrackDefinition;zoom:number;onZoom:(zoom:number)=>void;thresholds:LineThresholds}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [camera,setCamera]=useState<SceneCamera>(PERSPECTIVE_CAMERA);
 const drag=useRef<{x:number;y:number;pointerId:number}|null>(null);
 useEffect(()=>{
  const element=canvas.current;if(!element)return;
  const effectiveCamera={...camera,distance:Math.max(.42,Math.min(4.6,camera.distance/Math.max(.5,zoom)))};
  const draw=()=>renderScene3D(element,withScenarioIntersections({...track,obstacles:snapshot.obstacles},snapshot.scenarioIntersections),snapshot.robot,snapshot.obstacles,effectiveCamera,thresholds);
  const resize=new ResizeObserver(draw);resize.observe(element);
  draw();return()=>resize.disconnect();
 },[camera,snapshot,track,zoom,thresholds]);
 const move=(event:ReactPointerEvent<HTMLCanvasElement>)=>{
  if(!drag.current||drag.current.pointerId!==event.pointerId)return;
  const dx=event.clientX-drag.current.x,dy=event.clientY-drag.current.y;
  drag.current={x:event.clientX,y:event.clientY,pointerId:event.pointerId};
  setCamera(previous=>({...previous,azimuth:previous.azimuth-dx*.009,elevation:Math.max(.1,Math.min(Math.PI/2-.02,previous.elevation+dy*.007))}));
 };
 return <div className="arena-3d">
  <div className="arena-3d-presets" role="group" aria-label="Cámara tridimensional">
   <button type="button" aria-pressed={!camera.follow&&camera.elevation>1.4} onClick={()=>setCamera(TOP_CAMERA)}>Superior 3D</button>
   <button type="button" aria-pressed={!camera.follow&&camera.elevation<=1.4} onClick={()=>setCamera(PERSPECTIVE_CAMERA)}>Perspectiva</button>
   <button type="button" aria-pressed={camera.follow} onClick={()=>setCamera(FOLLOW_CAMERA)}>Seguir IROH</button>
  </div>
  <canvas ref={canvas} role="img" tabIndex={0} aria-label={`Vista tridimensional de ${track.id.toUpperCase()}. Usa flechas para girar la cámara y más o menos para acercarte.`}
   onPointerDown={event=>{if(event.button!==0)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,pointerId:event.pointerId};}}
   onPointerMove={move}
   onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);drag.current=null;}}
   onPointerCancel={()=>{drag.current=null;}}
   onWheel={event=>{event.preventDefault();const factor=event.deltaY>0?1/1.1:1.1;onZoom(Math.max(.75,Math.min(2,zoom*factor)));}}
   onKeyDown={event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(event.key))return;
    event.preventDefault();
    if(event.key==='+'||event.key==='='){onZoom(Math.min(2,zoom+.25));return;}
    if(event.key==='-'){onZoom(Math.max(.75,zoom-.25));return;}
    setCamera(previous=>({...previous,azimuth:previous.azimuth+(event.key==='ArrowRight'?.12:event.key==='ArrowLeft'?-.12:0),elevation:Math.max(.1,Math.min(Math.PI/2-.02,previous.elevation+(event.key==='ArrowUp'?.1:event.key==='ArrowDown'?-.1:0)))}));
   }}/>
 </div>;
}

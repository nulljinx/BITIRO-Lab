import {Minus,Plus,Maximize2,Minimize2,SlidersHorizontal,X,Ruler} from 'lucide-react';
import {IconButton} from '../../components/Controls';
export function SimulatorToolbar({zoom,onZoom,calibration,onCalibration,trackId,dimensions,fullscreen,onFullscreen}:{zoom:number;onZoom:(n:number)=>void;calibration:boolean;onCalibration:()=>void;trackId:string;dimensions:string;fullscreen:boolean;onFullscreen:()=>void}){
 return <div className="simulator-toolbar">
  <div className="viewport-label"><span className="viewport-id">{trackId.toUpperCase()}</span><span className="viewport-dim"><Ruler size={13}/>{dimensions}</span></div>
  <div className="viewport-tools">{!calibration&&<><div className="zoom-tools"><IconButton icon={Minus} label="Alejar pista" disabled={zoom<=.75} onClick={()=>onZoom(Math.max(.75,zoom-.25))}/><output aria-label="Zoom de pista">{Math.round(zoom*100)}%</output><IconButton icon={Plus} label="Acercar pista" disabled={zoom>=2} onClick={()=>onZoom(Math.min(2,zoom+.25))}/><IconButton icon={fullscreen?Minimize2:Maximize2} label={fullscreen?'Salir de pantalla completa':'Pantalla completa del simulador'} onClick={onFullscreen}/></div><span className="toolbar-separator"/></>}<button className={calibration?'calibration-toggle active':'calibration-toggle'} aria-pressed={calibration} onClick={onCalibration} title={calibration?'Salir del modo calibración':'Calibrar sensores'}>{calibration?<X size={16}/>:<SlidersHorizontal size={16}/>}<span>{calibration?'Salir de calibración':'Calibrar'}</span></button></div>
 </div>;
}

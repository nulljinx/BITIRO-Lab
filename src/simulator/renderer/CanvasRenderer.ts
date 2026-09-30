import type { TrackDefinition, RobotState } from '../types';
import { sensorPosition } from '../sensors';
import {strikeTip,STRIKE} from '../actuators';
import {viewportTransform} from './viewport';
import { ROBOT } from '../config';
import {SIMULATION_THEME as T} from './simulation-theme';
const cachedPaths=new WeakMap<object,Path2D[]>();
export function renderCanvas(canvas: HTMLCanvasElement, track: TrackDefinition, robot: RobotState, debug=false,zoom=1,activeSensor=1,thresholds:readonly number[]=[200,200,200],viewport?:{width:number;height:number}) {
  const ctx=canvas.getContext('2d'); if(!ctx) return;
  const rect=viewport??canvas.getBoundingClientRect(); const dpr=Math.min(devicePixelRatio || 1,2);
  const width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
  if(canvas.width!==width || canvas.height!==height) { canvas.width=width; canvas.height=height; }
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  ctx.fillStyle=T.viewport;ctx.fillRect(0,0,rect.width,rect.height);
  if(rect.width<=36||rect.height<=36)return;
  const {scale,offsetX,offsetY}=viewportTransform(rect.width,rect.height,track,zoom,debug?4.6:Infinity);
  ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
  ctx.fillStyle=T.paper;ctx.fillRect(0,0,track.physicalWidthCm,track.physicalHeightCm);
  ctx.strokeStyle=T.paperBorder;ctx.lineWidth=.2;ctx.strokeRect(0,0,track.physicalWidthCm,track.physicalHeightCm);
  if(debug) {ctx.strokeStyle=T.grid;for(let x=10;x<track.physicalWidthCm;x+=10){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,track.physicalHeightCm);ctx.stroke();}for(let y=10;y<track.physicalHeightCm;y+=10){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(track.physicalWidthCm,y);ctx.stroke();}}
  for(const z of track.finishZones) {ctx.fillStyle=z.kind==='finish-green'?T.finishGreen:T.finishRed;ctx.fillRect(z.x,z.y,z.width,z.height);ctx.fillStyle=T.zoneText;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='2.3px "IBM Plex Sans"';ctx.fillText(z.label,z.x+z.width/2,z.y+z.height/2);}
  for(const m of track.markers??[]) {ctx.fillStyle=m.kind==='start-red'?T.startRed:T.paperBorder;ctx.fillRect(m.x,m.y,m.width,m.height);if(m.label){ctx.fillStyle=T.zoneText;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='2.3px "IBM Plex Sans"';ctx.fillText(m.label,m.x+m.width/2,m.y+m.height/2);}}
  let paths=cachedPaths.get(track.paths);
  if(!paths){paths=track.paths.map(path=>{const shape=new Path2D();path.points.forEach((p,i)=>i?shape.lineTo(p.x,p.y):shape.moveTo(p.x,p.y));return shape;});cachedPaths.set(track.paths,paths);}
  track.paths.forEach((path,i)=>{ctx.strokeStyle=T.line;ctx.lineWidth=path.widthCm;ctx.lineCap=path.lineCap as CanvasLineCap;ctx.lineJoin='round';ctx.stroke(paths![i]);});
  if(track.id==='s03'){for(const path of track.paths){if(!path.id.startsWith('scenario-cross-')||!path.id.endsWith('-h'))continue;const match=path.id.match(/scenario-cross-(\d+)-h/);const a=path.points[0],b=path.points.at(-1)!;ctx.fillStyle='#A64A20';ctx.font='700 2px "IBM Plex Mono"';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(`I${Number(match?.[1]??0)+1}`,(a.x+b.x)/2,(a.y+b.y)/2-4);}}
  if(track.startLabel){ctx.fillStyle=T.label;ctx.font='2.4px "IBM Plex Sans"';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(track.startLabel.text,track.startLabel.x,track.startLabel.y);}
  for(const o of track.obstacles) {ctx.fillStyle=o.blocking===false?'#F0C98F':T.obstacle;ctx.fillRect(o.x,o.y,o.width,o.height);ctx.strokeStyle=T.obstacleStroke;ctx.lineWidth=.4;ctx.strokeRect(o.x,o.y,o.width,o.height);ctx.beginPath();ctx.moveTo(o.x+o.width/2,o.y);ctx.lineTo(o.x+o.width/2,o.y+o.height);ctx.stroke();if(track.id==='s03'){const n=o.id.match(/(\d+)$/)?.[1];if(n){ctx.fillStyle='#5D341A';ctx.font='700 2.2px "IBM Plex Mono"';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,o.x+o.width/2,o.y+o.height/2);}}}
  ctx.save();ctx.translate(robot.x,robot.y);ctx.rotate(robot.heading+Math.PI/2);
  ctx.fillStyle=T.robotShadow;ctx.beginPath();ctx.ellipse(.8,1.3,7.4,8,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=T.wheel;ctx.fillRect(-7,-4,2,8);ctx.fillRect(5,-4,2,8);
  ctx.fillStyle=T.body;ctx.beginPath();ctx.roundRect(-5.5,-6,11,13,3);ctx.fill();
  ctx.fillStyle=T.robotBlue;ctx.beginPath();ctx.roundRect(-4,-8,8,4,1.5);ctx.fill();
  ctx.fillStyle=T.robotCyan;for(const x of [-2.4,2.4]){ctx.beginPath();ctx.arc(x,-6.1,1.1,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle=T.lcd;ctx.fillRect(-3.2,-2,6.4,3);ctx.fillStyle=T.button;ctx.beginPath();ctx.arc(0,5,1.2,0,Math.PI*2);ctx.fill();ctx.restore();
  const {tip}=strikeTip(robot);ctx.strokeStyle=T.servo;ctx.lineWidth=1.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(robot.x+Math.cos(robot.heading)*STRIKE.pivotCm,robot.y+Math.sin(robot.heading)*STRIKE.pivotCm);ctx.lineTo(tip.x,tip.y);ctx.stroke();ctx.fillStyle=T.servoTip;ctx.beginPath();ctx.arc(tip.x,tip.y,1.7,0,Math.PI*2);ctx.fill();
  if(debug) {ctx.strokeStyle=T.robotBlue;ctx.lineWidth=.4;ctx.setLineDash([1.4,1.1]);ctx.beginPath();ctx.arc(robot.x,robot.y,ROBOT.radiusCm+1.2,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(robot.x,robot.y);ctx.lineTo(robot.x+Math.cos(robot.heading)*20,robot.y+Math.sin(robot.heading)*20);ctx.stroke();ctx.fillStyle=T.robotBlue;ctx.beginPath();ctx.arc(robot.x,robot.y,.9,0,Math.PI*2);ctx.fill();}
  if(debug)[-ROBOT.lineSpreadCm,0,ROBOT.lineSpreadCm].forEach((side,i)=>{const p=sensorPosition(robot,side);ctx.fillStyle=[robot.lineLeft,robot.lineCenter,robot.lineRight][i]>=thresholds[i]?T.sensorActive:T.sensorIdle;ctx.beginPath();ctx.arc(p.x,p.y,i===activeSensor?1.2:.7,0,Math.PI*2);ctx.fill();if(i===activeSensor){ctx.strokeStyle=T.robotBlue;ctx.lineWidth=.4;ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.stroke();}});
}

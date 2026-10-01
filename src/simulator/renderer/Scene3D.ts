/**
 * BITIRO integrated 3D viewport.
 *
 * This renderer deliberately stays lightweight: it draws a real 3D world with
 * Canvas2D and a small software rasterizer, while the authoritative physics,
 * sensors and permissions remain in the existing simulation engine.
 *
 * v7.4 refines visual framing: safer camera margins, cleaner paths, improved
 * scene balance and a closer follow view while leaving physics untouched.
 */
import type {TrackDefinition,RobotState,LineThresholds} from '../types';
import {ROBOT} from '../config';
import {strikeTip} from '../actuators';

type Vec3={x:number;y:number;z:number};
type Vertex={x:number;y:number;depth:number};
type Face={points:Vec3[];fill:string;stroke?:string;alpha?:number;layer?:number;lineWidth?:number};
export interface SceneCamera {azimuth:number;elevation:number;distance:number;follow:boolean}
const V=(x:number,y:number,z:number):Vec3=>({x,y,z});
const subtract=(a:Vec3,b:Vec3)=>V(a.x-b.x,a.y-b.y,a.z-b.z);
const dot=(a:Vec3,b:Vec3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a:Vec3,b:Vec3)=>V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const normalize=(a:Vec3)=>{const l=Math.hypot(a.x,a.y,a.z)||1;return V(a.x/l,a.y/l,a.z/l);};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

function addBox(faces:Face[],x:number,y:number,z:number,width:number,height:number,depth:number,colors:readonly [string,string,string],stroke?:string){
 const a=V(x,y,z),b=V(x+width,y,z),c=V(x+width,y,z+depth),d=V(x,y,z+depth);
 const e=V(x,y+height,z),f=V(x+width,y+height,z),g=V(x+width,y+height,z+depth),h=V(x,y+height,z+depth);
 faces.push({points:[a,b,f,e],fill:colors[1],stroke},{points:[b,c,g,f],fill:colors[2],stroke},
 {points:[d,a,e,h],fill:colors[2],stroke},{points:[c,d,h,g],fill:colors[1],stroke},
 {points:[e,f,g,h],fill:colors[0],stroke});
}
function ribbon(a:Vec3,b:Vec3,width:number,fill:string,stroke?:string):Face{
 const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;
 const ox=dz/length*width/2,oz=-dx/length*width/2;
 return {points:[V(a.x+ox,a.y,a.z+oz),V(b.x+ox,b.y,b.z+oz),V(b.x-ox,b.y,b.z-oz),V(a.x-ox,a.y,a.z-oz)],fill,stroke,layer:2};
}
function plane(faces:Face[],x:number,z:number,width:number,depth:number,y:number,fill:string,stroke?:string){faces.push({points:[V(x,y,z),V(x+width,y,z),V(x+width,y,z+depth),V(x,y,z+depth)],fill,stroke,layer:y<-.8?-1:y<-.45?0:1});}

export function renderScene3D(canvas:HTMLCanvasElement,track:TrackDefinition,robot:RobotState,obstacles:TrackDefinition['obstacles'],camera:SceneCamera,thresholds:LineThresholds=[ROBOT.threshold,ROBOT.threshold,ROBOT.threshold]){
 const context=canvas.getContext('2d');if(!context)return;
 const rect=canvas.getBoundingClientRect(),width=rect.width,height=rect.height;
 if(width<8||height<8)return;
 const dpr=Math.min(window.devicePixelRatio||1,2);
 if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 }
 context.setTransform(dpr,0,0,dpr,0,0);
 context.clearRect(0,0,width,height);
 const background=context.createLinearGradient(0,0,0,height);
 background.addColorStop(0,'#152838');background.addColorStop(.62,'#1C2E3B');background.addColorStop(1,'#111C25');
 context.fillStyle=background;context.fillRect(0,0,width,height);
 const X=(x:number)=>x-track.physicalWidthCm/2;
 const Z=(z:number)=>z-track.physicalHeightCm/2;
 const topView=!camera.follow&&camera.elevation>1.4;
 // In perspective mode the camera is biased slightly toward the live robot so
 // the starting IROH does not feel glued to the edge of the frame. Top view
 // remains centered on the plotter; follow view is centered on the robot.
 const target=camera.follow
  ?V(X(robot.x),3.4,Z(robot.y))
  :topView?V(0,0,0):V(X(robot.x)*.10,1.45,Z(robot.y)*.10);
 const reach=Math.max(track.physicalWidthCm,track.physicalHeightCm);
 // The integrated laboratory can become very wide while remaining relatively
 // short. Add a conservative framing margin in that shape so the physical
 // board stays inside the viewport instead of being cropped at the bottom.
 const viewportAspect=width/Math.max(1,height);
 const wideViewportBoost=camera.follow?1:clamp(viewportAspect/1.9,1,1.32);
 const dist=clamp(camera.distance,.55,3.8)*reach*wideViewportBoost;
 const cos=Math.cos(camera.elevation),sin=Math.sin(camera.elevation);
 const position=V(target.x+dist*cos*Math.cos(camera.azimuth),dist*sin,target.z+dist*cos*Math.sin(camera.azimuth));
 const forward=normalize(subtract(target,position));
 const right=normalize(cross(forward,V(0,1,0))),up=normalize(cross(right,forward));
 const focal=Math.min(width,height)*(camera.follow?1.30:topView?1.08:1.16);
 const project=(v:Vec3):Vertex|null=>{
  const relative=subtract(v,position),depth=dot(relative,forward);
  if(depth<.25)return null;
  return {x:width/2+dot(relative,right)*focal/depth,y:height/2-dot(relative,up)*focal/depth,depth};
 };
 const faces:Face[]=[];
 // Table / plinth. The extra outer frame gives the arena a physical presence.
 plane(faces,-track.physicalWidthCm/2-2.3,-track.physicalHeightCm/2-2.3,track.physicalWidthCm+4.6,track.physicalHeightCm+4.6,-1.25,'#465864','#5E707A');
 plane(faces,-track.physicalWidthCm/2-1.1,-track.physicalHeightCm/2-1.1,track.physicalWidthCm+2.2,track.physicalHeightCm+2.2,-.82,'#A9B3B8','#C4CCD0');
 plane(faces,-track.physicalWidthCm/2,-track.physicalHeightCm/2,track.physicalWidthCm,track.physicalHeightCm,-.5,'#F4F1E8','#D7D8D2');
 // Subtle 10 cm technical grid on the board.
 for(let gx=10;gx<track.physicalWidthCm;gx+=10){faces.push(ribbon(V(X(gx),-.46,Z(0)),V(X(gx),-.46,Z(track.physicalHeightCm)),.08,'#E2E1DA'));}
 for(let gz=10;gz<track.physicalHeightCm;gz+=10){faces.push(ribbon(V(X(0),-.455,Z(gz)),V(X(track.physicalWidthCm),-.455,Z(gz)),.08,'#E2E1DA'));}
 for(const zone of track.finishZones){plane(faces,X(zone.x),Z(zone.y),zone.width,zone.height,-.36,zone.kind==='finish-green'?'#75B898':'#D58F83','#52606A');}
 for(const marker of track.markers??[]){plane(faces,X(marker.x),Z(marker.y),marker.width,marker.height,-.33,'#D77869','#7C4842');}
 for(const path of track.paths){const stride=Math.max(1,Math.floor(path.points.length/135));for(let i=stride;i<path.points.length+stride;i+=stride){
  const first=path.points[Math.max(0,i-stride)],last=path.points[Math.min(i,path.points.length-1)];faces.push(ribbon(V(X(first.x),-.22,Z(first.y)),V(X(last.x),-.22,Z(last.y)),path.widthCm,'#20262A'));
 }}
 // Obstacles with an explicit footprint shadow and slightly bevel-like color split.
 for(const obstacle of obstacles){
  const cleared=track.id==='s03'&&obstacle.blocking===false;
  addBox(faces,X(obstacle.x)+.45,-.16,Z(obstacle.y)+.55,obstacle.width,1.2,obstacle.height,[cleared?'rgba(39,48,55,.10)':'rgba(39,48,55,.16)',cleared?'rgba(39,48,55,.09)':'rgba(39,48,55,.14)',cleared?'rgba(39,48,55,.08)':'rgba(39,48,55,.12)']);
  addBox(faces,X(obstacle.x),0,Z(obstacle.y),obstacle.width,10,obstacle.height,cleared?['#E7C99D','#C99263','#A56D46']:['#D7AA72','#A96E42','#845536'],cleared?'#B67846':'#75472D');
  addBox(faces,X(obstacle.x)+.35,10,Z(obstacle.y)+.35,Math.max(.1,obstacle.width-.7),.18,Math.max(.1,obstacle.height-.7),cleared?['#F0D8B4','#E2BC8E','#CC9865']:['#E4BD86','#D7A86F','#BF8654']);
 }
 if(track.id==='s03'){
  const sonarReach=clamp(robot.sonarCm>0?robot.sonarCm:22,14,28);
  const sonarOriginX=robot.x+Math.cos(robot.heading)*ROBOT.sonarOffsetCm;
  const sonarOriginY=robot.y+Math.sin(robot.heading)*ROBOT.sonarOffsetCm;
  const sonarBeamOffsets=[-.52,-.26,0,.26,.52];
  faces.push({
   points:[V(X(sonarOriginX),-.14,Z(sonarOriginY)),...sonarBeamOffsets.map(offset=>V(X(sonarOriginX+Math.cos(robot.heading+offset)*sonarReach),-.14,Z(sonarOriginY+Math.sin(robot.heading+offset)*sonarReach)))],
   fill:robot.sonarCm>0?'rgba(85,214,230,.16)':'rgba(85,214,230,.10)',
   stroke:robot.sonarCm>0?'rgba(85,214,230,.44)':'rgba(85,214,230,.28)',
   alpha:1,layer:2.2,lineWidth:.7
  });
 }
 // Robot geometry in local forward/right coordinates. The authoritative state
 // comes directly from the same physics engine used by the 2D view.
 const heading=robot.heading;
 const forward2=[Math.cos(heading),Math.sin(heading)],right2=[-Math.sin(heading),Math.cos(heading)];
 const local=(forwardCm:number,rightCm:number,y:number)=>V(X(robot.x)+forwardCm*forward2[0]+rightCm*right2[0],y,Z(robot.y)+forwardCm*forward2[1]+rightCm*right2[1]);
 const orientedBox=(fx:number,rx:number,y:number,length:number,w:number,h:number,top:string,side:string,stroke?:string)=>{
  const base=[local(fx-length/2,rx-w/2,y),local(fx+length/2,rx-w/2,y),local(fx+length/2,rx+w/2,y),local(fx-length/2,rx+w/2,y)];
  const topPoints=base.map(p=>V(p.x,p.y+h,p.z));
  faces.push({points:topPoints,fill:top,stroke});
  for(let i=0;i<4;i++)faces.push({points:[base[i],base[(i+1)%4],topPoints[(i+1)%4],topPoints[i]],fill:side,stroke});
 };
 const cylinderRight=(fx:number,rx:number,cy:number,radius:number,length:number,segments:number,sideFill:string,faceFill:string,hubFill?:string)=>{
  const left:Array<Vec3>=[],rightRing:Array<Vec3>=[];
  for(let i=0;i<segments;i++){
   const a=i/segments*Math.PI*2,ff=fx+Math.cos(a)*radius,yy=cy+Math.sin(a)*radius;
   left.push(local(ff,rx-length/2,yy));rightRing.push(local(ff,rx+length/2,yy));
  }
  faces.push({points:left,fill:faceFill,stroke:'#20252A'},{points:[...rightRing].reverse(),fill:faceFill,stroke:'#20252A'});
  for(let i=0;i<segments;i++){const n=(i+1)%segments;faces.push({points:[left[i],left[n],rightRing[n],rightRing[i]],fill:i%2===0?sideFill:'#2B3035',stroke:'#191D20'});}
  if(hubFill){
   const hubRadius=radius*.34;const hub:Array<Vec3>=[];
   for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;hub.push(local(fx+Math.cos(a)*hubRadius,rx+length/2+.03,cy+Math.sin(a)*hubRadius));}
   faces.push({points:[...hub].reverse(),fill:hubFill,stroke:'#282E33',layer:5});
  }
 };
 const cylinderForward=(fx:number,rx:number,cy:number,radius:number,length:number,segments:number,sideFill:string,faceFill:string)=>{
  const back:Array<Vec3>=[],frontRing:Array<Vec3>=[];
  for(let i=0;i<segments;i++){
   const a=i/segments*Math.PI*2,rr=rx+Math.cos(a)*radius,yy=cy+Math.sin(a)*radius;
   back.push(local(fx-length/2,rr,yy));frontRing.push(local(fx+length/2,rr,yy));
  }
  faces.push({points:back,fill:sideFill,stroke:'#1F2A30'},{points:[...frontRing].reverse(),fill:faceFill,stroke:'#1F2A30',layer:6});
  for(let i=0;i<segments;i++){const n=(i+1)%segments;faces.push({points:[back[i],back[n],frontRing[n],frontRing[i]],fill:sideFill,stroke:'#24313A'});}
 };
 const segmentBar=(a:Vec3,b:Vec3,y:number,barWidth:number,barHeight:number,top:string,side:string)=>{
  const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,ox=dz/l*barWidth/2,oz=-dx/l*barWidth/2;
  const lower=[V(a.x+ox,y,a.z+oz),V(b.x+ox,y,b.z+oz),V(b.x-ox,y,b.z-oz),V(a.x-ox,y,a.z-oz)];
  const upper=lower.map(p=>V(p.x,y+barHeight,p.z));faces.push({points:upper,fill:top,stroke:'#252B30',layer:6});
  for(let i=0;i<4;i++)faces.push({points:[lower[i],lower[(i+1)%4],upper[(i+1)%4],upper[i]],fill:side,stroke:'#252B30',layer:6});
 };
 // Contact shadow beneath the whole robot.
 const shadow=Array.from({length:28},(_,i)=>local(Math.cos(i*Math.PI/14)*8.2,Math.sin(i*Math.PI/14)*7.2,-.18));
 faces.push({points:shadow,fill:'#1B2730',alpha:.20,layer:3});
 // Wheels: the real IROH's yellow wheels are an important visual anchor.
 cylinderRight(-.2,-6.2,3.2,3.55,2.45,18,'#2B2E31','#E5B617','#6D7377');
 cylinderRight(-.2,6.2,3.2,3.55,2.45,18,'#2B2E31','#E5B617','#6D7377');
 // Small front support/caster.
 cylinderRight(5.0,0,1.25,1.1,1.25,14,'#25292D','#3E474D','#7B858C');
 // Two-level chassis with thin plates and metal standoffs.
 orientedBox(-.3,0,2.45,12.6,10.7,.9,'#1D252B','#11171C','#0B1014');
 orientedBox(-.5,0,5.45,11.1,9.2,.8,'#252E34','#141B20','#0D1216');
 for(const fx of [-4.6,4.15])for(const rx of [-3.8,3.8])orientedBox(fx,rx,3.28,.55,.55,2.25,'#C4CDD2','#87949B','#5E6970');
 // Electronics: main green board, Arduino-style controller, headers and LCD.
 orientedBox(-2.0,0,6.25,5.7,6.8,.36,'#17674D','#104737','#0D382C');
 orientedBox(-1.55,-1.05,6.62,3.5,3.0,.32,'#1266A8','#0B4777','#083A63');
 orientedBox(-1.05,2.25,6.62,2.8,1.2,.45,'#29343B','#171F24','#11181C');
 for(let i=0;i<6;i++)orientedBox(-3.85+i*.62,-3.05,6.62,.26,.46,.52,'#D8B65A','#9B813C','#735F2C');
 for(let i=0;i<6;i++)orientedBox(-3.85+i*.62,3.05,6.62,.26,.46,.52,'#D8B65A','#9B813C','#735F2C');
 orientedBox(-.15,0,6.68,3.9,5.8,.22,robot.lcdBacklight?'#A8E9C1':'#28433A','#173028','#10241D');
 orientedBox(-4.4,0,6.67,1.25,1.25,.75,robot.buttonPressed?'#DB6C42':'#AAB5BC','#6A747A','#545E64');
 // Blue sonar mast and twin transducers at the front.
 orientedBox(4.35,0,5.1,2.3,6.8,4.2,'#1555B4','#0F3A83','#0B2C65');
 cylinderForward(5.75,-1.72,7.65,1.28,1.05,16,'#7A878E','#D9E0E4');
 cylinderForward(5.75,1.72,7.65,1.28,1.05,16,'#7A878E','#D9E0E4');
 cylinderForward(6.32,-1.72,7.65,.63,.16,16,'#303A40','#222A2F');
 cylinderForward(6.32,1.72,7.65,.63,.16,16,'#303A40','#222A2F');
 // Three front line-sensor modules below the nose. Their indicator color follows
 // the live readings, while position stays attached to the physical robot.
 const sensorValues=[robot.lineLeft,robot.lineCenter,robot.lineRight];
 for(let i=0;i<3;i++){
  const lateral=[-2.6,0,2.6][i],active=sensorValues[i]>=thresholds[i];
  orientedBox(5.4,lateral,.75,1.5,1.4,.5,'#172126','#0C1317','#05090B');
  orientedBox(5.88,lateral,.98,.55,.72,.12,active?'#59D6E6':'#325B72',active?'#2F9FB0':'#223E4E');
 }
 // Compact IR modules at the front corners.
 orientedBox(4.72,-4.15,3.65,1.05,.9,.65,robot.irLeft?'#D65D58':'#444D53','#293137');
 orientedBox(4.72,4.15,3.65,1.05,.9,.65,robot.irRight?'#D65D58':'#444D53','#293137');
 if(track.id==='s01'||track.id==='s03'){
  // Golpe servo and arm. S04 no lo utiliza, por eso se oculta en esa sesión.
  const {pivot,tip}=strikeTip(robot),pivotWorld=V(X(pivot.x),3.65,Z(pivot.y)),tipWorld=V(X(tip.x),3.65,Z(tip.y));
  orientedBox(5.1,0,3.15,1.6,2.2,1.6,'#376AA5','#244B77','#1B385A');
  segmentBar(pivotWorld,tipWorld,3.55,.9,.72,'#DDE4E7','#9DA9B0');
 }
 // Painter's algorithm is sufficient for this modest scene.
 const sorted=faces.map(face=>{
  const vertices=face.points.map(project);
  return {face,vertices,depth:vertices.reduce((a,v)=>a+(v?.depth??0),0)/vertices.length};
 }).filter(item=>item.vertices.every(Boolean)).sort((a,b)=>(a.face.layer??3)-(b.face.layer??3)||b.depth-a.depth);
 for(const {face,vertices} of sorted){const v=vertices as Vertex[];
  context.beginPath();context.moveTo(v[0].x,v[0].y);
  for(let i=1;i<v.length;i++)context.lineTo(v[i].x,v[i].y);
  context.closePath();context.globalAlpha=face.alpha??1;
  context.fillStyle=face.fill;context.fill();if(face.stroke){context.strokeStyle=face.stroke;context.lineWidth=face.lineWidth??.65;context.stroke();}
 }
 context.globalAlpha=1;
 // Finish-zone numbers are painted directly over the physical base zones.
 // In S02 this keeps the plotter readable without adding floating HUD cards
 // that can cover the track or feel detached from the board.
 for(const zone of track.finishZones){
  const match=zone.label.match(/\d+/);
  if(!match)continue;
  const center=project(V(X(zone.x+zone.width/2),-.12,Z(zone.y+zone.height/2)));
  const left=project(V(X(zone.x),-.12,Z(zone.y+zone.height/2)));
  const rightEdge=project(V(X(zone.x+zone.width),-.12,Z(zone.y+zone.height/2)));
  const topEdge=project(V(X(zone.x+zone.width/2),-.12,Z(zone.y)));
  const bottomEdge=project(V(X(zone.x+zone.width/2),-.12,Z(zone.y+zone.height)));
  if(!center||!left||!rightEdge||!topEdge||!bottomEdge)continue;
  const projectedWidth=Math.hypot(rightEdge.x-left.x,rightEdge.y-left.y);
  const projectedHeight=Math.hypot(bottomEdge.x-topEdge.x,bottomEdge.y-topEdge.y);
  const fontSize=clamp(Math.min(projectedWidth,projectedHeight)*.62,12,38);
  context.save();
  context.textAlign='center';
  context.textBaseline='middle';
  context.font=`800 ${fontSize}px "IBM Plex Sans", sans-serif`;
  context.lineJoin='round';
  context.lineWidth=Math.max(2,fontSize*.11);
  context.strokeStyle='rgba(244,241,232,.82)';
  context.strokeText(match[0],center.x,center.y);
  context.fillStyle='#17372B';
  context.fillText(match[0],center.x,center.y);
  context.restore();
 }
 if(track.id==='s03'){
  context.save();context.textAlign='center';context.textBaseline='middle';
  for(const obstacle of obstacles){const center=project(V(X(obstacle.x+obstacle.width/2),10.35,Z(obstacle.y+obstacle.height/2)));const n=obstacle.id.match(/(\d+)$/)?.[1];if(center&&n){context.fillStyle=obstacle.blocking===false?'#8A5A2F':'#5C321A';context.font='700 12px "IBM Plex Mono", monospace';context.fillText(n,center.x,center.y);}}
  for(const path of track.paths){if(!path.id.startsWith('scenario-cross-')||!path.id.endsWith('-h'))continue;const a=path.points[0],b=path.points.at(-1)!;const center=project(V(X((a.x+b.x)/2),.2,Z((a.y+b.y)/2)));const idx=path.id.match(/scenario-cross-(\d+)-h/)?.[1];if(center){context.fillStyle='#A64A20';context.font='700 10px "IBM Plex Mono", monospace';context.fillText(`I${Number(idx??0)+1}`,center.x,center.y-8);}}
  context.restore();
 }
 // Instrument overlay kept deliberately sparse: it identifies the scene without
 // competing with the simulator controls supplied by React.
 context.fillStyle='rgba(8,18,27,.70)';context.fillRect(14,14,196,38);
 context.fillStyle='#EAF3F6';context.font='600 11px "IBM Plex Mono", monospace';
 context.fillText(`BITIRO / ${track.id.toUpperCase()} / 3D`,26,30);
 context.font='10px "IBM Plex Sans", sans-serif';context.fillStyle='#AFC2CB';
 context.fillText(camera.follow?'Seguimiento IROH':topView?'Vista superior · rueda para zoom':'Arrastra para orbitar · rueda para zoom',26,45);
 if(track.id==='s01'){
  const status=robot.strikeServoAttached?`GOLPE ${Math.round(robot.strikeServoAngle)}°`:'GOLPE SIN INICIALIZAR';
  context.font='10px "IBM Plex Mono", monospace';const tw=context.measureText(status).width;
  context.fillStyle='rgba(8,18,27,.68)';context.fillRect(width-tw-30,height-30,tw+18,19);
  context.fillStyle=robot.strikeServoAttached?'#75D0DC':'#91A3AC';context.fillText(status,width-tw-21,height-16);
 }
}

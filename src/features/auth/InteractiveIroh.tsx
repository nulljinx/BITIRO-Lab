import {useEffect,useRef,useState,type CSSProperties} from 'react';

type Props={passwordActive:boolean;passwordVisible:boolean;success?:boolean};
type LayerProps={src:string;className?:string;style?:CSSProperties};

const ASSET='/brand/iroh/interactive/';

function Layer({src,className='',style}:LayerProps){
  return <img className={`iroh-raster-layer ${className}`} src={`${ASSET}${src}`} alt="" draggable={false} style={style}/>;
}

const pos=(x:number,y:number,width:number,height:number):CSSProperties=>({
  left:`${x/9}%`,top:`${y/10.86}%`,width:`${width/9}%`,height:`${height/10.86}%`,
});

export function InteractiveIroh({passwordActive,passwordVisible,success=false}:Props){
  const rootRef=useRef<HTMLDivElement>(null);
  const [blink,setBlink]=useState(false);
  const privacyClosed=passwordActive&&!passwordVisible;
  const closed=privacyClosed||blink;

  useEffect(()=>{
    const root=rootRef.current;
    if(!root)return;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0;
    const move=(event:PointerEvent)=>{
      if(media.matches||privacyClosed)return;
      if(frame)cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const rect=root.getBoundingClientRect();
        const cx=rect.left+rect.width*.55;
        const cy=rect.top+rect.height*.33;
        const nx=Math.max(-1,Math.min(1,(event.clientX-cx)/(window.innerWidth*.38)));
        const ny=Math.max(-1,Math.min(1,(event.clientY-cy)/(window.innerHeight*.38)));
        root.style.setProperty('--iroh-gaze-x',`${(nx*5).toFixed(2)}px`);
        root.style.setProperty('--iroh-gaze-y',`${(ny*3.25).toFixed(2)}px`);
        root.style.setProperty('--iroh-head-rotate',`${(nx*.9).toFixed(2)}deg`);
      });
    };
    window.addEventListener('pointermove',move,{passive:true});
    return()=>{window.removeEventListener('pointermove',move);if(frame)cancelAnimationFrame(frame);};
  },[privacyClosed]);

  useEffect(()=>{
    const root=rootRef.current;
    if(!root)return;
    if(privacyClosed){
      root.style.setProperty('--iroh-gaze-x','0px');
      root.style.setProperty('--iroh-gaze-y','0px');
      root.style.setProperty('--iroh-head-rotate','-.6deg');
    }
  },[privacyClosed]);

  useEffect(()=>{
    if(privacyClosed)return;
    let timer=0,openTimer=0;
    const schedule=()=>{
      timer=window.setTimeout(()=>{
        setBlink(true);
        openTimer=window.setTimeout(()=>{setBlink(false);schedule();},125);
      },4000+Math.random()*3000);
    };
    schedule();
    return()=>{window.clearTimeout(timer);window.clearTimeout(openTimer);};
  },[privacyClosed]);

  return <div
    ref={rootRef}
    className={`interactive-iroh layered-iroh${privacyClosed?' is-private':''}${success?' is-success':''}`}
    aria-hidden="true"
  >
    <div className="iroh-raster-canvas">
      <Layer src="01-sombra.png" className="iroh-shadow" style={pos(174,902,596,84)}/>
      <Layer src="02-rueda-izquierda.png" className="iroh-wheel iroh-wheel-left" style={pos(238,752,208,196)}/>
      <Layer src="03-rueda-derecha.png" className="iroh-wheel iroh-wheel-right" style={pos(469,777,204,183)}/>

      <div className="iroh-torso-group">
        <Layer src="06-relleno-articulaciones.png" style={pos(254,403,478,357)}/>
        <Layer src="08-torso.png" style={pos(231,400,511,399)}/>
      </div>

      <Layer src="04-brazo-senalando.png" className="iroh-arm-pointing" style={{...pos(75,268,245,325),transformOrigin:`${(299-75)/245*100}% ${(537-268)/325*100}%`}}/>
      <Layer src="05-brazo-abajo.png" className="iroh-arm-down" style={{...pos(634,574,153,257),transformOrigin:`${(666-634)/153*100}% ${(607-574)/257*100}%`}}/>

      <div className="iroh-head-group">
        <Layer src="07-cabeza.png" style={pos(282,173,493,356)}/>
        <div className={`iroh-eye-open${closed?' is-hidden':''}`}>
          <Layer src="09-blanco-izquierdo.png" style={pos(346,258,116,125)}/>
          <Layer src="10-blanco-derecho.png" style={pos(507,299,133,133)}/>
          <Layer src="09-iris-izquierdo.png" className="iroh-iris" style={pos(351,269,73,87)}/>
          <Layer src="10-iris-derecho.png" className="iroh-iris" style={pos(515,310,80,90)}/>
        </div>
        <div className={`iroh-eye-closed${closed?' is-visible':''}`}>
          <Layer src="ojo-cerrado-izquierdo.png" style={pos(346,258,116,125)}/>
          <Layer src="ojo-cerrado-derecho.png" style={pos(507,299,133,133)}/>
        </div>
        <Layer src="11-mejilla-izquierda.png" className="iroh-cheek-light" style={pos(324,361,64,56)}/>
        <Layer src="12-mejilla-derecha.png" className="iroh-cheek-light" style={pos(548,426,82,54)}/>
        <Layer src="13-luz-cian-izquierda.png" style={pos(330,351,15,15)}/>
        <Layer src="14-luz-cian-derecha.png" style={pos(622,425,16,16)}/>
      </div>

      <Layer src="15-destellos.png" className="iroh-sparks" style={pos(228,140,107,118)}/>
    </div>
  </div>;
}

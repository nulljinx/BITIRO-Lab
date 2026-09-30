import {Component,type ErrorInfo,type ReactNode} from 'react';
import {RotateCcw,ArrowLeft,Unplug} from 'lucide-react';
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(_error:Error,_info:ErrorInfo){}
  render(){
    if(!this.state.failed)return this.props.children;
    return <main id="main" className="recovery-page"><Unplug size={36}/><span className="eyebrow">Conexión interrumpida</span><h1>No pudimos abrir esta vista.</h1><p>Comprueba tu conexión y vuelve a intentarlo. Tu código guardado permanece en este navegador.</p><div className="button-row"><button className="primary" onClick={()=>location.reload()}><RotateCcw size={17}/>Volver a cargar</button><a className="button" href="/intermedio"><ArrowLeft size={17}/>Volver a la ruta</a></div></main>;
  }
}

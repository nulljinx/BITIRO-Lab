import {useCallback,useEffect,useRef,useState} from 'react';
import {ChevronDown,Copy,FileInput,GraduationCap,LoaderCircle,Play} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {fetchMentorSolution,MENTOR_SOLUTION_ERROR,type MentorSolution} from './mentor-solution';

type PanelState={kind:'idle'}|{kind:'loading'}|{kind:'error'}|{kind:'ready';solution:MentorSolution};

/**
 * Mentor-only reference panel. mentorMode is a UI condition, NOT the security boundary: the RPC rejects anyone who
 * cannot manage the cohort. The solution lives only in this component's state: it is requested when the panel opens
 * and discarded on close, session/cohort/user change, sign-out and unmount. Never stored, preloaded or logged.
 */
export function MentorSolutionPanel({cohortId,userId,sessionId,canRun,onLoad,onRun}:{cohortId:string;userId:string;sessionId:string;canRun:boolean;onLoad:(source:string)=>void;onRun:(source:string)=>void}) {
  const [open,setOpen]=useState(false);
  const [state,setState]=useState<PanelState>({kind:'idle'});
  const [copied,setCopied]=useState(false);
  const controller=useRef<AbortController|null>(null);
  const copiedTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);

  const discard=useCallback(()=>{
    controller.current?.abort();controller.current=null;
    clearTimeout(copiedTimer.current);
    setOpen(false);setState({kind:'idle'});setCopied(false);
  },[]);

  // Different session, cohort or user, or unmount: drop the request and the content.
  useEffect(()=>{discard();return()=>{controller.current?.abort();controller.current=null;clearTimeout(copiedTimer.current);};},[cohortId,userId,sessionId,discard]);
  // Sign-out (or session replacement) while the panel is open.
  useEffect(()=>{
    if(!supabase)return;
    const {data}=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'||event==='USER_UPDATED')discard();});
    return()=>data.subscription.unsubscribe();
  },[discard]);

  async function request(){
    controller.current?.abort();
    const current=new AbortController();controller.current=current;
    setState({kind:'loading'});
    try{
      const solution=await fetchMentorSolution(cohortId,sessionId,current.signal);
      if(controller.current!==current)return; // stale reply: closed or replaced meanwhile
      setState({kind:'ready',solution});
    }catch{
      if(controller.current!==current)return;
      setState({kind:'error'});
    }
  }
  function toggle(next:boolean){
    if(next===open)return;
    if(!next){discard();return;}
    setOpen(true);void request();
  }
  async function copy(source:string){
    try{await navigator.clipboard.writeText(source);setCopied(true);clearTimeout(copiedTimer.current);copiedTimer.current=setTimeout(()=>setCopied(false),1800);}catch{/* El código sigue visible para copiar manualmente. */}
  }
  const solution=state.kind==='ready'?state.solution:null;
  return <details className="mentor-solution" open={open} onToggle={event=>toggle(event.currentTarget.open)}>
    <summary><span className="mentor-solution-icon"><GraduationCap size={17}/></span><span><strong>Solución de referencia</strong><small>{sessionId.toUpperCase()} · se consulta al abrir · solo visible para mentor.</small></span><ChevronDown size={17}/></summary>
    {open&&<div className="mentor-solution-body">
      {state.kind==='loading'&&<p role="status" className="mentor-solution-state"><LoaderCircle size={16} className="spin"/> Cargando solución…</p>}
      {state.kind==='error'&&<p role="alert" className="mentor-solution-state">{MENTOR_SOLUTION_ERROR}</p>}
      {solution&&<>
        <div className="mentor-solution-heading"><div><span className="eyebrow">REFERENCIA DOCENTE</span><h3>{solution.title}</h3><p>{solution.note}</p></div>
          <div className="mentor-solution-actions"><button type="button" onClick={()=>void copy(solution.source)}><Copy size={15}/>{copied?'Copiada':'Copiar código'}</button><button type="button" onClick={()=>onLoad(solution.source)}><FileInput size={15}/>Cargar en editor</button><button type="button" className="primary" disabled={!canRun} onClick={()=>onRun(solution.source)}><Play size={15}/>Probar referencia</button></div></div>
        <div className="mentor-solution-code-label"><span>Código completo de referencia</span><span>{solution.source.split('\n').length} líneas</span></div>
        <pre aria-label={`Código completo de referencia ${sessionId.toUpperCase()}`}><code>{solution.source}</code></pre>
        <p className="mentor-solution-warning">La referencia es privada del mentor. “Probar referencia” ejecuta este código sin modificar tu editor ni registrar progreso del grupo. “Cargar en editor” sí reemplaza tu copia actual y pide confirmación.</p>
      </>}
    </div>}
  </details>;
}

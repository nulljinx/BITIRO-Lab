import {useEffect, useState, useRef} from 'react';
import {Code2, Check, Download, ScanSearch, Play, BookOpen, ChevronDown, LoaderCircle, GraduationCap, Copy, FileInput} from 'lucide-react';
import Editor, {loader} from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import type {SessionDefinition} from '../../content/sessions';
import type {SimulationConnection} from '../simulator/useSimulation';
import {api} from '../../content/api';
import {loadCode, saveCode, markExplored, getStorageScope,localCodeDocument} from './storage';
import {fetchCloudLearning,saveCloudCode,markCloudActivity,type CloudContext,type CloudDocument,type LearningStatus} from './cloud-learning';
import {isSupportedSource, SOURCE_LIMIT_MESSAGE} from '../../simulator/runtime/source-size';
import {mentorSolutionFor} from '../../content/mentor-solutions';
(self as typeof self & {MonacoEnvironment:unknown}).MonacoEnvironment={getWorker:()=>new EditorWorker()};
loader.config({monaco});
monaco.editor.defineTheme('bitiro-night',{base:'vs-dark',inherit:true,rules:[{token:'comment',foreground:'A3AAB2'},{token:'keyword',foreground:'82B6D9'},{token:'string',foreground:'9FD4AF'},{token:'number',foreground:'F4C07A'}],colors:{'editor.background':'#101419','editorLineNumber.foreground':'#8994A2','editor.foreground':'#E8E4DB','editor.lineHighlightBackground':'#191F27','editor.selectionBackground':'#63432E','editorCursor.foreground':'#FFAF75','editorIndentGuide.background1':'#303842','editorIndentGuide.activeBackground1':'#77818D'}});
export function CodeEditor({session,onGuide,simulation,storageScope,cloudContext,mentorMode=false}:{session:SessionDefinition;onGuide:()=>void;simulation?:SimulationConnection;storageScope?:string;cloudContext?:CloudContext;mentorMode?:boolean}) {
  const [scope]=useState(()=>storageScope??getStorageScope());
  const [code,setCode]=useState(()=>loadCode(session,scope));
  const [saveState,setSaveState]=useState<'saved'|'pending'|'error'>('saved');
  const [sizeError,setSizeError]=useState('');
  const [cloudState,setCloudState]=useState<'none'|'loading'|'saved'|'pending'|'offline'|'conflict'>(cloudContext?'loading':'none');
  const [cloudMessage,setCloudMessage]=useState('');
  const [progress,setProgress]=useState<LearningStatus|null>(null);
  const keepHighestProgress=(status:LearningStatus)=>setProgress(previous=>{const level={visited:1,attempted:2,completed:3};return previous&&level[previous]>level[status]?previous:status;});
  const [remoteConflict,setRemoteConflict]=useState<CloudDocument|null>(null);
  const revisionRef=useRef<number|null>(null),cloudReady=useRef(false),typedRef=useRef(false);
  const uploadRef=useRef<string|null>(null),cloudTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),uploadingRef=useRef(false);
  const aliveRef=useRef(true);
  const currentCode=useRef(code);
  const editor=useRef<monaco.editor.IStandaloneCodeEditor|null>(null);
  const apiDecorations=useRef<string[]>([]);
  const allowedApi=api.filter(a=>a.since<=session.number);
  const pending=useRef<string|null>(null), timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const mentorSolution=mentorMode?mentorSolutionFor(session.id):null;
  const [mentorCopied,setMentorCopied]=useState(false);
  async function pushCloud(){
    if(!aliveRef.current||!cloudContext||!cloudReady.current||uploadingRef.current||uploadRef.current===null)return;
    const source=uploadRef.current;
    const revision=revisionRef.current;
    if(revision===null)return;
    uploadRef.current=null;uploadingRef.current=true;
    try{
      const result=await saveCloudCode(cloudContext,session.id,source,revision);
      if(!aliveRef.current)return;
      if(!result.ok){
        uploadRef.current=null;cloudReady.current=false;
        const latest=await fetchCloudLearning(cloudContext,session.id);
        if(!aliveRef.current)return;
        revisionRef.current=latest.document?.revision??0;
        if(latest.document && latest.document.source!==currentCode.current){
          setRemoteConflict(latest.document);setCloudState('conflict');setCloudMessage('Otra pestaña o dispositivo cambió tu código. El código local sigue intacto.');
        }else{cloudReady.current=true;setCloudState('saved');}
        return;
      }
      revisionRef.current=result.revision??revision+1;setCloudMessage('');
      setCloudState(uploadRef.current===null?'saved':'pending');
    }catch{
      if(aliveRef.current){setCloudState('offline');setCloudMessage('Sin sincronización. Tu código está guardado en este navegador.');}
      uploadRef.current=null;
    }finally{
      uploadingRef.current=false;
      if(uploadRef.current!==null&&aliveRef.current&&cloudReady.current){
        clearTimeout(cloudTimer.current);cloudTimer.current=setTimeout(()=>{void pushCloud();},1200);
      }
    }
  }
  function queueCloud(source:string){
    if(!aliveRef.current||!cloudContext||!cloudReady.current)return;
    uploadRef.current=source;setCloudState('pending');clearTimeout(cloudTimer.current);
    cloudTimer.current=setTimeout(()=>{void pushCloud();},1000);
  }
  function flush(updateUI=true) {
    clearTimeout(timer.current);
    if(pending.current===null)return;
    const ok=saveCode(session.id,pending.current,scope);
    if(ok){queueCloud(pending.current);pending.current=null;}
    if(updateUI)setSaveState(ok?'saved':'error');
  }
  function markers(){
    const model=editor.current?.getModel();
    if(model)monaco.editor.setModelMarkers(model,'iroh-runtime',(simulation?.diagnostics??[]).map(d=>({severity:monaco.MarkerSeverity.Error,startLineNumber:d.line,startColumn:d.column,endLineNumber:d.endLine,endColumn:d.endColumn,message:d.message,code:d.kind})));
  }
  function highlightIrohApi(){
    const instance=editor.current,model=instance?.getModel();
    if(!instance||!model)return;
    // Highlight every real function exported by the IROH teaching library.
    // Completion suggestions can stay session-scoped, but correct function names
    // should always be visually recognizable when a student types them manually.
    const entries=new Map(api.map(entry=>[entry.name,entry]));
    const decorations:monaco.editor.IModelDeltaDecoration[]=[];
    for(let lineNumber=1;lineNumber<=model.getLineCount();lineNumber++){
      const line=model.getLineContent(lineNumber);
      const matcher=/\b[A-Za-z_]\w*\b/g;
      let match:RegExpExecArray|null;
      while((match=matcher.exec(line))!==null){
        const name=match[0],entry=entries.get(name);if(!entry)continue;
        const remainder=line.slice(match.index+name.length);
        if(!/^\s*\(/.test(remainder))continue;
        const introduction=entry.since>session.number?`\n\nSe introduce formalmente desde S${String(entry.since).padStart(2,'0')}.`:'';
        decorations.push({range:new monaco.Range(lineNumber,match.index+1,lineNumber,match.index+name.length+1),options:{inlineClassName:'iroh-api-function',hoverMessage:{value:`Función IROH reconocida: \`${name}()\`${introduction}`}}});
      }
    }
    apiDecorations.current=instance.deltaDecorations(apiDecorations.current,decorations);
  }
  useEffect(markers,[simulation?.diagnostics]);
  useEffect(()=>{
    if(!cloudContext)return;
    const handler=(event:Event)=>{
      const detail=(event as CustomEvent<{cohortId:string;sessionId:string}>).detail;
      if(detail?.cohortId===cloudContext.cohortId&&detail.sessionId===session.id)setProgress('completed');
    };
    window.addEventListener('bitiro:mission-saved',handler);
    return()=>window.removeEventListener('bitiro:mission-saved',handler);
  },[cloudContext?.cohortId,session.id]);
  useEffect(()=>{
    if(!cloudContext)return;
    let active=true;aliveRef.current=true;
    setCloudState('loading');setCloudMessage('');setRemoteConflict(null);cloudReady.current=false;
    void (async()=>{
      try{
        const remote=await fetchCloudLearning(cloudContext,session.id);
        if(!active)return;
        revisionRef.current=remote.document?.revision??0;
        setProgress(remote.progress?.status??null);
        const local=localCodeDocument(session.id,scope);
        if(remote.document && remote.document.source!==currentCode.current){
          if(!local&&!typedRef.current){
            // No authored local draft: safely restore the cloud document.
            currentCode.current=remote.document.source;setCode(remote.document.source);
            saveCode(session.id,remote.document.source,scope);
            cloudReady.current=true;setCloudState('saved');
          }else{
            setRemoteConflict(remote.document);setCloudState('conflict');
            setCloudMessage('Hay una versión distinta en la nube. Conservamos tu copia local hasta que elijas cuál usar.');
          }
        }else{
          cloudReady.current=true;setCloudState('saved');
          if(!remote.document && (local||typedRef.current))queueCloud(currentCode.current);
        }
      }catch{if(active){setCloudState('offline');setCloudMessage('No pudimos consultar la nube. Sigue disponible tu copia local.');}}
      try{const status=await markCloudActivity(cloudContext,session.id,'visited');if(active)keepHighestProgress(status);}catch{/* offline/local recovery remains available */}
    })();
    return()=>{active=false;aliveRef.current=false;clearTimeout(cloudTimer.current);};
  },[cloudContext?.cohortId,cloudContext?.userId,cloudContext?.activityVersion,session.id,scope]);
  function selectLocal(){
    revisionRef.current=remoteConflict?.revision??revisionRef.current;
    setRemoteConflict(null);cloudReady.current=true;setCloudMessage('');queueCloud(currentCode.current);
  }
  function selectRemote(){
    if(!remoteConflict)return;
    revisionRef.current=remoteConflict.revision;
    currentCode.current=remoteConflict.source;setCode(remoteConflict.source);
    saveCode(session.id,remoteConflict.source,scope);
    pending.current=null;clearTimeout(timer.current);setSaveState('saved');
    uploadRef.current=null;clearTimeout(cloudTimer.current);
    setRemoteConflict(null);cloudReady.current=true;setCloudState('saved');setCloudMessage('');
  }

  useEffect(()=>{
    markExplored(session.id,scope);
    // Opening a document is a visit, not an edit: do not change its local timestamp.
    const handleHide=()=>flush(false);
    window.addEventListener('pagehide',handleHide);
    const allowed=allowedApi;
    const completion=monaco.languages.registerCompletionItemProvider('cpp',{provideCompletionItems:(model,position)=>{
      const word=model.getWordUntilPosition(position);
      return {suggestions:allowed.map(a=>({label:a.name,kind:monaco.languages.CompletionItemKind.Function,insertText:a.name,detail:a.signature,documentation:a.description,range:new monaco.Range(position.lineNumber,word.startColumn,position.lineNumber,word.endColumn)}))};
    }});
    const hover=monaco.languages.registerHoverProvider('cpp',{provideHover:(model,position)=>{
      const a=allowed.find(a=>a.name===model.getWordAtPosition(position)?.word);
      return a?{contents:[{value:'\u0060'+a.signature+'\u0060'},{value:a.description}]}:undefined;
    }});
    return()=>{flush(false);window.removeEventListener('pagehide',handleHide);completion.dispose();hover.dispose();};
  },[session.id,session.number,scope]);
  useEffect(()=>{highlightIrohApi();},[code,session.number]);
  function change(value:string|undefined){
    const next=value??'';if(next===currentCode.current)return;
    currentCode.current=next;typedRef.current=true;setCode(next);clearTimeout(timer.current);
    if(!isSupportedSource(next)){pending.current=null;setSizeError(SOURCE_LIMIT_MESSAGE);setSaveState('error');return;}
    setSizeError('');pending.current=next;setSaveState('pending');
    timer.current=setTimeout(()=>flush(),350);
  }
  function download(){
    const url=URL.createObjectURL(new Blob([code],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`intermedio_${session.id}.ino`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const busy=simulation?.reviewState==='Revisando'||simulation?.reviewState==='Cargando programa…',running=!!simulation&&['running','paused'].includes(simulation.snapshot.status);
  const unavailable=!simulation||simulation.engineState!=='ready'||!!sizeError;
  function execute(run:boolean){
    flush();simulation?.source(code,run);
    if(run&&cloudContext){void markCloudActivity(cloudContext,session.id,'attempted').then(keepHighestProgress).catch(()=>{
      setCloudMessage('El intento no se sincronizó. Tu código local permanece disponible.');
    });}
  }
  function loadMentorSolution(){
    if(!mentorSolution)return;
    change(mentorSolution.source);
    window.setTimeout(()=>{editor.current?.revealLineInCenter(1);editor.current?.setPosition({lineNumber:1,column:1});editor.current?.focus();},0);
  }
  function runMentorSolution(){
    if(!mentorSolution||!simulation||unavailable||running||busy)return;
    change(mentorSolution.source);
    flush();
    simulation.source(mentorSolution.source,true);
    if(cloudContext){void markCloudActivity(cloudContext,session.id,'attempted').then(keepHighestProgress).catch(()=>{
      setCloudMessage('El intento no se sincronizó. Tu código local permanece disponible.');
    });}
    window.setTimeout(()=>{editor.current?.revealLineInCenter(1);editor.current?.setPosition({lineNumber:1,column:1});},0);
  }
  async function copyMentorSolution(){
    if(!mentorSolution)return;
    try{await navigator.clipboard.writeText(mentorSolution.source);setMentorCopied(true);window.setTimeout(()=>setMentorCopied(false),1800);}catch{/* El código sigue visible para copiar manualmente. */}
  }
  return <section className="code-panel" aria-label="Editor de código">
    <div className="file-bar"><span className="file-tab"><i aria-hidden="true"/><Code2 size={16}/>intermedio_{session.id}.ino</span><span className={saveState==='error'?'save-error':'saved'} role="status">{saveState==='saved'?<><Check size={14}/>Guardado local</>:saveState==='pending'?'Guardando…':'Sin guardar'}</span>{cloudContext&&<span className="cloud-save-status" role="status">{cloudState==='saved'?'Nube sincronizada':cloudState==='loading'?'Consultando nube…':cloudState==='pending'?'Sincronizando…':cloudState==='conflict'?'Revisar versiones':cloudState==='offline'?'Solo copia local':''}</span>}</div>
    {remoteConflict&&<div className="cloud-conflict" role="alert"><strong>Dos versiones de tu código</strong><p>{cloudMessage}</p><div className="button-row"><button type="button" onClick={selectLocal}>Usar mi versión local</button><button type="button" onClick={selectRemote}>Usar versión de la nube</button></div></div>}
    {cloudMessage&&cloudState!=='conflict'&&<p className="cloud-alert" role="status">{cloudMessage}</p>}
    {cloudContext&&<p className="cloud-progress" role="status">Actividad del grupo: {progress==='completed'?'Superada en simulador (autoevaluación)':progress==='attempted'?'Intentada':progress==='visited'?'Visitada':'Sin registrar'}</p>}
    <div className="editor-toolbar"><span className="runtime-target">Arduino / IROH <i>local</i></span><div className="editor-tools">{simulation&&<span className={`program-load-state ${!simulation.programLoaded?'is-empty':simulation.loadedSource===code?'is-loaded':'has-changes'}`}>{!simulation.programLoaded?'Listo para probar':simulation.loadedSource===code?'En simulador':'Cambios nuevos'}</span>}<button onClick={download}><Download size={16}/>Descargar .ino</button></div></div>
    <div className="editor-wrap"><Editor onMount={instance=>{editor.current=instance;markers();highlightIrohApi();}} height="100%" language="cpp" path={`bitiro-${encodeURIComponent(scope)}-${session.id}.ino`} value={code} onChange={change} theme="bitiro-night" loading={<p className="editor-loading">Preparando el editor…</p>} options={{fontFamily:'IBM Plex Mono',fontSize:14,lineHeight:24,minimap:{enabled:false},scrollBeyondLastLine:false,padding:{top:16},automaticLayout:true,tabSize:2,wordWrap:'on',accessibilitySupport:'on',ariaLabel:'Código Arduino',tabFocusMode:true}}/></div>
    <details className="editor-mission"><summary><BookOpen size={16}/>Misión y funciones<span className="mission-count">{session.objectives.length} objetivos</span><ChevronDown size={16}/></summary><div className="editor-mission-body"><ol className="mission-objectives">{session.objectives.map((o,index)=><li key={o}><span className="mission-step">{index+1}</span><span>{o}</span></li>)}</ol><div className="mission-help"><button className="text-link mission-guide-link" onClick={onGuide}>Consultar API y conceptos<BookOpen size={16}/></button><p className="mission-hint"><span><kbd>Tab</kbd> recorre controles</span><span><kbd>Ctrl+M</kbd> cambia el modo de tabulación</span></p></div></div></details>
    {mentorSolution&&<details className="mentor-solution"><summary><span className="mentor-solution-icon"><GraduationCap size={17}/></span><span><strong>Solución del mentor</strong><small>Referencia privada para mostrar al cierre del desafío.</small></span><ChevronDown size={17}/></summary><div className="mentor-solution-body"><div className="mentor-solution-heading"><div><span className="eyebrow">HERRAMIENTA DEL MENTOR</span><h3>{mentorSolution.title}</h3><p>{mentorSolution.note}</p></div><div className="mentor-solution-actions"><button type="button" onClick={()=>void copyMentorSolution()}><Copy size={15}/>{mentorCopied?'Copiada':'Copiar'}</button><button type="button" onClick={loadMentorSolution}><FileInput size={15}/>Cargar en editor</button><button type="button" className="primary" disabled={busy||running||unavailable} onClick={runMentorSolution}><Play size={15}/>Probar solución</button></div></div><pre><code>{mentorSolution.source}</code></pre><p className="mentor-solution-warning">Esta referencia no se muestra en la interfaz de participantes. Al cargarla en el editor reemplaza la copia que el mentor tenga abierta.</p></div></details>}
    {simulation&&<div className={`runtime-diagnostics ${simulation.reviewState==='Sin errores'?'is-success':simulation.reviewState==='Error'?'is-error':''}`}><p role="status">{busy?(simulation.reviewState==='Cargando programa…'?'Cargando el programa en el simulador…':'Revisando tu programa…'):simulation.reviewState==='Ejecutando'?(simulation.snapshot.status==='paused'?'Programa en pausa':'Programa iniciado. Observa al IROH.'):simulation.reviewState==='Sin errores'?'No se encontraron errores. El código está listo para ejecutar.':simulation.reviewState}</p><ul>{simulation.diagnostics.map((d,i)=><li key={i}><button className="diagnostic" onClick={()=>{editor.current?.revealLineInCenter(d.line);editor.current?.setPosition({lineNumber:d.line,column:d.column});editor.current?.focus();}}>Línea {d.line}, columna {d.column}: {d.message}</button></li>)}</ul></div>}
    <div className="editor-bottom-bar">{simulation?<><button className="review-button" disabled={busy||running||unavailable} onClick={()=>execute(false)}><ScanSearch size={18}/>Revisar código</button><button className="primary execute-button" disabled={busy||running||unavailable} title={running?'Detén la prueba antes de iniciar otra':'Probar la versión que estás viendo en el editor'} onClick={()=>execute(true)}>{busy?<LoaderCircle className="spin" size={18}/>:<Play size={18}/>}Probar código</button></>:<span>Material y editor · simulación próximamente</span>}</div>
    {saveState==='error'&&<p className="save-warning" role="alert">{sizeError||'No se pudo guardar. Descarga tu código para conservarlo.'}</p>}
  </section>;
}


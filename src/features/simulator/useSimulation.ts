import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {WorkerCommand, WorkerResponse, Snapshot} from '../../simulator/types';
import type {Diagnostic} from '../../simulator/runtime/runtime-types';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {isSupportedSource, SOURCE_LIMIT_MESSAGE} from '../../simulator/runtime/source-size';
import {trackForSession} from '../../content/tracks';

export function useSimulation(sessionId:string) {
  const track=useMemo(()=>trackForSession(sessionId),[sessionId]);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => new SimulationEngine(track).snapshot());
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [reviewState, setReviewState] = useState('Listo');
  const [engineState, setEngineState] = useState<'starting'|'ready'|'error'>('starting');
  const [engineError, setEngineError] = useState('');
  const [generation, setGeneration] = useState(0);
  const [loadedSource,setLoadedSource]=useState<string|null>(null);
  const latest = useRef(snapshot), worker = useRef<Worker|null>(null), requestId = useRef(0);
  const pendingRun = useRef<{requestId:number;source:string}|null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const ready = useRef(false);
  const failRef = useRef<(message:string)=>void>(()=>{});
  const clearDeadline = useCallback(() => { clearTimeout(timeout.current); timeout.current = undefined; }, []);
  useEffect(() => {
    let disposed = false;
    ready.current = false;
    pendingRun.current=null;
    setLoadedSource(null);
    const localSnapshot=new SimulationEngine(track).snapshot();latest.current=localSnapshot;setSnapshot(localSnapshot);
    setEngineState('starting'); setEngineError(''); setReviewState('Listo'); setDiagnostics([]);
    const fail = (message: string) => {
      if (disposed) return;
      clearDeadline(); ready.current = false; worker.current?.terminate(); worker.current = null;
      requestId.current++; pendingRun.current=null; setEngineState('error'); setEngineError(message); setReviewState('Motor no disponible');
      setSnapshot(old => {const stopped = {...old, status:'error' as const, robot:{...old.robot, leftMotor:0, rightMotor:0}}; latest.current=stopped; return stopped;});
    };
    failRef.current = fail;
    try {
      const w = new Worker(new URL('../../simulator/worker/simulator.worker.ts', import.meta.url), {type:'module'});
      worker.current = w;
      timeout.current = setTimeout(() => fail('El motor no respondió al iniciar. Tu código sigue en el editor.'), 10000);
      w.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (disposed) return;
        const response = event.data;
        if(response.type==='track-ready'){
          if(response.trackId!==sessionId)return;
          ready.current=true;clearDeadline();setEngineState('ready');latest.current=response.snapshot;setSnapshot(response.snapshot);return;
        }
        if (!ready.current) return;
        switch(response.type) {
          case 'snapshot': latest.current=response.snapshot; setSnapshot(response.snapshot); break;
          case 'compile-ok':
            if (response.requestId===requestId.current) {
              clearDeadline(); setDiagnostics([]);
              if(response.running){
                const pending=pendingRun.current;
                if(pending?.requestId===response.requestId)setLoadedSource(pending.source);
                pendingRun.current=null;
                setReviewState('Ejecutando');
              } else setReviewState('Sin errores');
            }
            break;
          case 'compile-error':
            if (response.requestId===requestId.current) { clearDeadline(); pendingRun.current=null; setDiagnostics(response.diagnostics); setReviewState('Error'); }
            break;
          case 'runtime-error': clearDeadline(); setDiagnostics([response.diagnostic]); setReviewState('Error'); break;
          case 'program-finished': setReviewState('Prueba terminada · puedes probar otra vez'); break;
        }
      };
      w.onerror = event => { event.preventDefault(); fail('El motor se interrumpió. Reinícialo para continuar con tu código.'); };
      w.onmessageerror = () => fail('No se pudo leer la respuesta del motor.');
      w.postMessage({type:'configure-track',trackId:sessionId} satisfies WorkerCommand);
    } catch { fail('No se pudo iniciar el motor en este navegador.'); }
    return () => { disposed=true; clearDeadline(); worker.current?.terminate(); worker.current=null; ready.current=false; };
  }, [generation, clearDeadline, sessionId, track]);
  const send = useCallback((command: WorkerCommand) => {
    if (!ready.current || !worker.current) return;
    if (['reset','stop-program','stop','pose'].includes(command.type)) {
      clearDeadline(); requestId.current++; pendingRun.current=null; setDiagnostics([]);
      setReviewState(command.type==='reset'
        ?'Todo listo para un nuevo intento'
        :command.type==='stop-program'||command.type==='stop'
          ?'Prueba detenida · puedes probar otra vez'
          :'Listo');
    }
    try { worker.current.postMessage(command); } catch { failRef.current('No se pudo enviar la instrucción al motor.'); }
  }, [clearDeadline]);
  const startSource = useCallback((code:string,run:boolean) => {
    if (!isSupportedSource(code)) { setReviewState(SOURCE_LIMIT_MESSAGE); return; }
    if (!ready.current || !worker.current) return;
    clearDeadline(); setReviewState(run?'Cargando programa…':'Revisando');
    const id = ++requestId.current;
    pendingRun.current=run?{requestId:id,source:code}:null;
    timeout.current=setTimeout(()=>failRef.current('La revisión tardó demasiado. Reinicia el motor e inténtalo de nuevo.'),10000);
    try{worker.current.postMessage({type:run?'run-program':'load-program', source:code, requestId:id} satisfies WorkerCommand);}catch{failRef.current('No se pudo enviar el programa al motor.');}
  }, [clearDeadline]);
  const source = useCallback((code: string, run: boolean) => startSource(code,run), [startSource]);
  const runLoadedProgram = useCallback(() => {
    if(loadedSource===null||!ready.current||!worker.current)return;
    startSource(loadedSource,true);
  },[loadedSource,startSource]);
  const resetTrial = useCallback(() => {
    if(!ready.current||!worker.current)return;
    send({type:'reset'});
  },[send]);
  const retry = useCallback(() => setGeneration(value=>value+1), []);
  return {snapshot, latest, send, source, runLoadedProgram, resetTrial, loadedSource, programLoaded:loadedSource!==null, diagnostics, reviewState, engineState, engineError, retry, track};
}
export type SimulationConnection = ReturnType<typeof useSimulation>;

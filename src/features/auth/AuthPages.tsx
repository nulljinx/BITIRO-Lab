import {useEffect,useState,type FormEvent} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {ArrowLeft,ArrowRight,Eye,EyeOff,LoaderCircle} from 'lucide-react';
import {Brand} from '../../components/Brand';
import {useAuth} from './AuthProvider';
import {consumeOAuthNext,safeNext} from './auth-navigation';
import {InteractiveIroh} from './InteractiveIroh';

type Mode='login'|'register'|'reset'|'update'|'callback';
const copy:Record<Mode,{eyebrow:string;title:string;description:string;action:string}>={
  login:{eyebrow:'Tu cuenta BITIRO',title:'Vuelve a tu espacio.',description:'Ingresa para continuar.',action:'Ingresar'},
  register:{eyebrow:'Cuenta BITIRO',title:'Un lugar para seguir aprendiendo.',description:'Crea tu cuenta BITIRO. Después podrás habilitar los programas de tu institución con un código.',action:'Crear cuenta'},
  reset:{eyebrow:'Recuperar acceso',title:'Volvamos a conectar.',description:'Escribe el correo de tu cuenta para solicitar un enlace de recuperación.',action:'Enviar enlace'},
  update:{eyebrow:'Protege tu cuenta',title:'Elige una contraseña nueva.',description:'Usa una contraseña de al menos 12 caracteres que no utilices en otros servicios.',action:'Guardar contraseña'},
  callback:{eyebrow:'Verificando acceso',title:'Preparando tu cuenta.',description:'Estamos comprobando el enlace que recibiste por correo.',action:'Continuar'},
};
function GoogleMark(){return <svg className="google-mark" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>;}
function PasswordField({id,label,value,onChange,confirm=false,onFocusChange,onVisibilityChange}:{id:string;label:string;value:string;onChange:(value:string)=>void;confirm?:boolean;onFocusChange?:(focused:boolean)=>void;onVisibilityChange?:(visible:boolean)=>void}){
  const [visible,setVisible]=useState(false);
  const toggle=()=>{const next=!visible;setVisible(next);onVisibilityChange?.(next);};
  return <div className="form-field"><label htmlFor={id}>{label}</label><div className="password-field"><input id={id} name={id} type={visible?'text':'password'} value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>onFocusChange?.(true)} onBlur={()=>onFocusChange?.(false)} autoComplete={id==='password-login'?'current-password':'new-password'} required minLength={id==='password-login'?undefined:12} maxLength={128} aria-describedby={id==='password-login'?undefined:'password-help'}/><button className="password-toggle" type="button" onClick={toggle} aria-label={`${visible?'Ocultar':'Mostrar'} ${confirm?'confirmación de contraseña':'contraseña'}`} aria-pressed={visible}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>;
}
export function AuthPage({mode}:{mode:Mode}){
  const auth=useAuth(),navigate=useNavigate(),[params]=useSearchParams();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[displayName,setDisplayName]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[callbackExpired,setCallbackExpired]=useState(false);
  const [googleBusy,setGoogleBusy]=useState(false),[passwordActive,setPasswordActive]=useState(false),[passwordVisible,setPasswordVisible]=useState(false);
  const content=copy[mode],next=safeNext(params.get('next')),unconfigured=auth.status==='unconfigured';
  const loginReady=mode!=='login'||(email.trim().length>0&&password.length>0);
  useEffect(()=>{setError('');setMessage('');setPassword('');setConfirmation('');setCallbackExpired(false);},[mode]);
  const oauthFailed=mode==='callback'&&Boolean(params.get('error')||params.get('error_code'));
  useEffect(()=>{
    if(auth.status!=='authenticated')return;
    // An existing session never needs the login form again; the callback also resumes the destination saved before OAuth.
    if(mode==='callback'){
      const stored=consumeOAuthNext();
      navigate(params.get('recovery')==='1'?'/actualizar-clave':params.get('next')?next:stored??next,{replace:true});
    }else if(mode==='login'||mode==='register')navigate(next,{replace:true});
  },[mode,auth.status,navigate,next,params]);
  useEffect(()=>{const reset=(event:PageTransitionEvent)=>{if(event.persisted)setGoogleBusy(false);};window.addEventListener('pageshow',reset);return()=>window.removeEventListener('pageshow',reset);},[]);
  async function continueWithGoogle(){
    if(busy||googleBusy||unconfigured)return;
    setError('');setMessage('');setGoogleBusy(true);
    try{await auth.signInWithGoogle(next);}
    catch(err){setGoogleBusy(false);setError(err instanceof Error?err.message:'No pudimos iniciar el acceso con Google.');}
  }
  useEffect(()=>{if(mode!=='callback')return;const timer=setTimeout(()=>setCallbackExpired(true),20000);return()=>clearTimeout(timer);},[mode]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError('');setMessage('');
    if(busy)return;
    if(unconfigured){
      if(mode==='login')setError('El acceso aún no está disponible en este entorno.');
      return;
    }
    if((mode==='register'||mode==='update')&&(password.length<12||password.length>128)){setError('La contraseña debe tener entre 12 y 128 caracteres.');return;}
    if((mode==='register'||mode==='update')&&password!==confirmation){setError('Las contraseñas no coinciden. Revisa ambos campos.');return;}
    if(mode==='register'&&(displayName.trim().length<2||displayName.trim().length>80)){setError('Escribe un nombre visible de 2 a 80 caracteres.');return;}
    setBusy(true);
    try{
      if(mode==='login'){await auth.signIn(email.trim(),password);navigate(next,{replace:true});}
      else if(mode==='register'){
        const result=await auth.signUp({email:email.trim(),password,displayName:displayName.trim()});
        setPassword('');setConfirmation('');
        if(result.confirmationRequired)setMessage('Solicitud recibida. Revisa tu correo y, si corresponde, sigue el enlace para confirmar tu cuenta. Si ya tienes una cuenta, puedes ingresar o recuperar el acceso.');
        else navigate('/espacios',{replace:true});
      }else if(mode==='reset'){await auth.resetPassword(email.trim());setMessage('Si existe una cuenta asociada y puede recibir el mensaje, encontrarás un enlace de recuperación en tu correo. Revisa también la carpeta de spam.');}
      else if(mode==='update'){await auth.updatePassword(password);setPassword('');setConfirmation('');setMessage('Contraseña actualizada. Ya puedes volver al laboratorio.');}
    }catch(err){
      const fallback=mode==='login'?'No pudimos iniciar sesión. Revisa tu correo y contraseña.':mode==='update'?'No pudimos actualizar la contraseña. El enlace puede haber caducado; solicita uno nuevo.':'No pudimos completar la solicitud. Inténtalo de nuevo en unos minutos.';
      setError(err instanceof Error?err.message:fallback);
    }finally{setBusy(false);}
  }
  const awaitingRecovery=mode==='update'&&auth.status!=='authenticated';
  return <main id="main" className={`auth-page auth-page--${mode}`}><header className="auth-header"><Brand/><Link className="text-link" to="/"><ArrowLeft size={16}/>Volver a BITIRO</Link></header><div className="auth-layout"><section className="auth-form-panel" aria-labelledby="auth-title"><span className="eyebrow">{content.eyebrow}</span><h1 id="auth-title">{content.title}</h1><p>{content.description}</p>
    {unconfigured&&mode!=='login'?<div className="form-message" role="status">Acceso no disponible en esta instalación.</div>:null}
    {mode==='callback'?<div className="form-message" role="status">{auth.error||callbackExpired||oauthFailed?<><p>No pudimos confirmar el acceso con este enlace. Puedes volver a ingresar o solicitar un enlace nuevo.</p><div className="button-row"><Link className="button" to="/login">Ir a ingresar</Link><Link className="text-link" to="/recuperar">Recuperar acceso</Link></div></>:unconfigured?'Las cuentas no están configuradas en esta instalación.':<><LoaderCircle className="spin" size={18}/>Comprobando el enlace…</>}</div>:<>
      {awaitingRecovery&&!unconfigured&&<div className="form-message" role="status">{auth.status==='loading'?'Comprobando tu sesión…':<>Necesitas abrir un enlace de recuperación válido o ingresar a tu cuenta. <Link to="/recuperar">Solicitar enlace</Link></>}</div>}
      {(mode==='login'||mode==='register')&&<div className="auth-google">
        <button className="google-button" type="button" onClick={()=>void continueWithGoogle()} disabled={googleBusy||busy||unconfigured} aria-busy={googleBusy}>{googleBusy?<LoaderCircle className="spin" size={18}/>:<GoogleMark/>}<span>{googleBusy?'Abriendo Google…':'Continuar con Google'}</span></button>
        <p className="auth-divider"><span>o usa tu correo</span></p>
      </div>}
      <form onSubmit={submit} aria-busy={busy}>
        {mode==='register'&&<div className="form-field"><label htmlFor="display-name">Nombre visible</label><input id="display-name" name="displayName" autoComplete="nickname" value={displayName} onChange={e=>setDisplayName(e.target.value)} minLength={2} maxLength={80} required aria-describedby="name-help"/><small id="name-help" className="form-caption">Puedes usar un alias. No necesitamos tu nombre legal.</small></div>}
        {mode!=='update'&&<div className="form-field"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={e=>{setEmail(e.target.value);if(error)setError('');}} maxLength={254} required/></div>}
        {(mode==='login'||mode==='register'||mode==='update')&&<PasswordField id={mode==='login'?'password-login':'password-new'} label={mode==='update'?'Nueva contraseña':'Contraseña'} value={password} onChange={value=>{setPassword(value);if(error)setError('');}} onFocusChange={setPasswordActive} onVisibilityChange={setPasswordVisible}/>}
        {(mode==='register'||mode==='update')&&<><p id="password-help" className="form-caption">Entre 12 y 128 caracteres. Se permite pegar desde tu gestor de contraseñas.</p><PasswordField id="password-confirm" label="Repite la contraseña" value={confirmation} onChange={value=>{setConfirmation(value);if(error)setError('');}} confirm onFocusChange={setPasswordActive} onVisibilityChange={setPasswordVisible}/></>}
        {mode==='register'&&<p className="form-caption">Tu cuenta BITIRO no te incorpora automáticamente a una institución. Después de registrarte podrás habilitar un programa con el código que te entregue tu mentor. Consulta cómo tratamos los datos en <Link to="/privacidad">Privacidad</Link>.</p>}
        {error&&<p className="form-error" role="alert">{error}</p>}{message&&<div className="form-message" role="status">{message}{mode==='update'&&<p><Link to="/espacios">Ir a mis espacios</Link></p>}</div>}
        <div className="button-row"><button className="primary" type="submit" disabled={busy||auth.status==='loading'||awaitingRecovery||!loginReady||(unconfigured&&mode!=='login')}>{busy?<LoaderCircle className="spin" size={17}/>:<ArrowRight size={17}/>} {busy?'Un momento…':content.action}</button>{mode==='login'&&<Link className="text-link" to="/recuperar">Olvidé mi contraseña</Link>}</div>
      </form>
      <p className="auth-switch">{mode==='login'?<>¿Primera vez? <Link to={`/registro?next=${encodeURIComponent(next)}`}>Crea tu cuenta</Link></>:mode==='register'?<>¿Ya tienes cuenta? <Link to={`/login?next=${encodeURIComponent(next)}`}>Ingresar</Link></>:<Link to={`/login?next=${encodeURIComponent(next)}`}>Volver a ingresar</Link>}</p>
      {mode==='login'&&<p className="auth-privacy-link"><Link className="text-link" to="/privacidad">Privacidad y datos</Link></p>}
    </>}
    </section><aside className="auth-aside" aria-label="Tu espacio BITIRO">
      <div className="auth-aside-copy">
        <h2>Continúa donde lo dejaste.</h2>
      </div>
      <div className="auth-visual-stage" aria-hidden="true">
        <span className="auth-visual-orbit is-one"/>
        <span className="auth-visual-orbit is-two"/>
        <InteractiveIroh passwordActive={passwordActive} passwordVisible={passwordVisible} success={Boolean(message)&&mode!=='reset'}/>
      </div>
      {mode!=='login'&&<div className="auth-aside-footer"><Link className="text-link" to="/privacidad">Privacidad y datos</Link></div>}
    </aside></div></main>;
}

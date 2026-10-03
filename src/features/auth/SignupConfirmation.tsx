import {useEffect,useRef,type KeyboardEvent} from 'react';
import {LoaderCircle,MailCheck} from 'lucide-react';

export interface SignupConfirmationProps{
  maskedEmail:string;resendBusy:boolean;cooldownSeconds:number;feedback:string;feedbackIsError:boolean;
  onResend:()=>void;onUseOther:()=>void;
}
// Accessible dialog: focus moves to the title, Tab stays inside, Escape returns to the form. The same facts
// are plain text in the dialog, so nothing depends on the overlay or an animation to be understood.
export function SignupConfirmation({maskedEmail,resendBusy,cooldownSeconds,feedback,feedbackIsError,onResend,onUseOther}:SignupConfirmationProps){
  const root=useRef<HTMLDivElement>(null),title=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{title.current?.focus();},[]);
  function keys(event:KeyboardEvent<HTMLDivElement>){
    if(event.key==='Escape'){event.stopPropagation();onUseOther();return;}
    if(event.key!=='Tab'||!root.current)return;
    const items=[...root.current.querySelectorAll<HTMLElement>('button:not([disabled]),[href],[tabindex="0"]')];
    const active=document.activeElement;
    if(items.length===0){event.preventDefault();title.current?.focus();return;}
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&(active===first||active===title.current)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}
  }
  const blocked=resendBusy||cooldownSeconds>0;
  return <div className="signup-confirm-backdrop"><div ref={root} className="signup-confirm" role="dialog" aria-modal="true" aria-labelledby="signup-confirm-title" aria-describedby="signup-confirm-text" onKeyDown={keys}>
    <span className="signup-confirm-icon" aria-hidden="true"><MailCheck size={30}/></span>
    <h2 id="signup-confirm-title" ref={title} tabIndex={-1}>Revisa tu correo</h2>
    <p id="signup-confirm-text">Te enviamos un enlace de verificación a <strong className="signup-confirm-email">{maskedEmail}</strong>. Abre el enlace para activar tu cuenta BITIRO.</p>
    <p className="form-caption">Si no lo ves, revisa la carpeta de spam. El enlace puede tardar unos minutos.</p>
    <div role="status" aria-live="polite" className={feedbackIsError?'form-error':'form-message'} hidden={!feedback}>{feedback}</div>
    <div className="button-row">
      <button type="button" className="primary" onClick={onResend} disabled={blocked} aria-disabled={blocked} aria-busy={resendBusy}>{resendBusy&&<LoaderCircle className="spin" size={17}/>}{resendBusy?'Reenviando…':cooldownSeconds>0?`Reenviar correo (${cooldownSeconds} s)`:'Reenviar correo'}</button>
      <button type="button" className="button" onClick={onUseOther}>Usar otro correo</button>
    </div>
  </div></div>;
}

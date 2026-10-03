import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {decideCallbackView,maskEmail,resendCooldownMs,resendRemainingSeconds,type CallbackInput} from '../features/auth/signup-flow';
import {SignupConfirmation} from '../features/auth/SignupConfirmation';
import {decideSpacesEntry} from '../app/route-decisions';

const signUp=vi.fn(),resend=vi.fn(),exchangeCodeForSession=vi.fn();
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({auth:{signUp,resend,exchangeCodeForSession}}),supabase:{}}));
beforeEach(()=>{signUp.mockReset();resend.mockReset();exchangeCodeForSession.mockReset();vi.stubGlobal('window',{location:{origin:'https://bitiro.test'}});});

const base:CallbackInput={status:'loading',providerError:false,accountError:false,oauth:false,recovery:false,hasCode:true,exchange:'idle',expired:false};
const dialog=(over:Partial<Parameters<typeof SignupConfirmation>[0]>={})=>renderToStaticMarkup(createElement(SignupConfirmation,{maskedEmail:maskEmail('ana.perez@gmail.com'),resendBusy:false,cooldownSeconds:0,feedback:'',feedbackIsError:false,onResend:()=>{},onUseOther:()=>{},...over}));

describe('email sign-up confirmation',()=>{
  it('signUp reports confirmationRequired when Supabase returns no session',async()=>{
    signUp.mockResolvedValue({data:{session:null},error:null});
    const {signUp:run}=await import('../features/auth/auth-service');
    await expect(run({email:'ana@x.cl',password:'una-clave-larga-12',displayName:'Ana'})).resolves.toEqual({confirmationRequired:true});
    expect(signUp.mock.calls[0][0].options.emailRedirectTo).toBe('https://bitiro.test/auth/callback');
  });
  it('renders an accessible "Revisa tu correo" dialog with a masked address',()=>{
    const html=dialog();
    expect(html).toContain('role="dialog"');expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="signup-confirm-title"');expect(html).toContain('Revisa tu correo');
    expect(html).toContain('a•••@g•••.com');expect(html).not.toContain('ana.perez');
    expect(html).toContain('Reenviar correo');expect(html).toContain('Usar otro correo');
  });
  it('masks addresses without leaking them and tolerates malformed input',()=>{
    expect(maskEmail('  Ana@Mail.co.cl ')).toBe('A•••@M•••.cl');expect(maskEmail('sin-arroba')).toBe('•••');
  });
  it('disables resend while busy or cooling down',()=>{
    expect(dialog({cooldownSeconds:42})).toMatch(/<button[^>]*disabled[^>]*>[^<]*Reenviar correo \(42 s\)/);
    expect(dialog({resendBusy:true})).toContain('aria-busy="true"');
    expect(resendRemainingSeconds(Date.now()+resendCooldownMs,Date.now())).toBeGreaterThan(55);expect(resendRemainingSeconds(0,1000)).toBe(0);
  });
  it('resend uses signup type and the /auth/callback redirect, with a generic error',async()=>{
    resend.mockResolvedValue({error:null});
    const {resendSignupConfirmation}=await import('../features/auth/auth-service');
    await resendSignupConfirmation(' ana@x.cl ');
    expect(resend).toHaveBeenCalledWith({type:'signup',email:'ana@x.cl',options:{emailRedirectTo:'https://bitiro.test/auth/callback'}});
    resend.mockResolvedValue({error:new Error('User already registered secret detail')});
    await expect(resendSignupConfirmation('ana@x.cl')).rejects.toThrow(/^No pudimos reenviar el correo\./);
  });
});

describe('/auth/callback outcomes',()=>{
  it('valid code + successful exchange + authenticated shows "verified" then /espacios',()=>{
    expect(decideCallbackView({...base,status:'authenticated',exchange:'ok'})).toBe('verified-redirect');
    expect(decideCallbackView({...base,status:'anonymous',exchange:'ok'})).toBe('working');
  });
  it('/espacios then applies the workspace rules: 0 onboarding, 1 direct',()=>{
    expect(decideSpacesEntry({status:'authenticated',workspacesLoading:false,workspaceCount:0}).kind).toBe('render');
    expect(decideSpacesEntry({status:'authenticated',workspacesLoading:false,workspaceCount:1}).kind).toBe('redirect-sole-workspace');
  });
  it('exchange error is invalid, even if a session already existed',()=>{
    expect(decideCallbackView({...base,status:'anonymous',exchange:'error'})).toBe('invalid');
    expect(decideCallbackView({...base,status:'authenticated',exchange:'error'})).toBe('invalid');
    expect(decideCallbackView({...base,status:'anonymous',hasCode:false,providerError:true})).toBe('invalid');
  });
  it('never claims "verified" from the code alone, a pre-existing session or a timeout',()=>{
    expect(decideCallbackView({...base,status:'authenticated',exchange:'pending'})).toBe('working');
    expect(decideCallbackView({...base,status:'authenticated',exchange:'idle'})).toBe('working');
    expect(decideCallbackView({...base,status:'anonymous',exchange:'pending'})).toBe('working');
    expect(decideCallbackView({...base,status:'anonymous',exchange:'pending',expired:true})).toBe('invalid');
    expect(decideCallbackView({...base,status:'anonymous',exchange:'ok',expired:true})).toBe('invalid');
  });
  it('Google and recovery callbacks navigate straight on after their exchange',()=>{
    expect(decideCallbackView({...base,status:'authenticated',exchange:'ok',oauth:true})).toBe('redirect');
    expect(decideCallbackView({...base,status:'authenticated',exchange:'ok',recovery:true})).toBe('redirect');
    expect(decideCallbackView({...base,status:'authenticated',hasCode:false})).toBe('redirect');
  });
});

describe('PKCE code exchange',()=>{
  it('resolves on success and runs exactly once per code',async()=>{
    exchangeCodeForSession.mockResolvedValue({data:{session:{}},error:null});
    const {exchangeAuthCode}=await import('../features/auth/auth-service');
    await Promise.all([exchangeAuthCode('code-ok'),exchangeAuthCode('code-ok')]);
    await exchangeAuthCode('code-ok');
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(exchangeCodeForSession).toHaveBeenCalledWith('code-ok');
  });
  it('rejects with a generic message on error or when no session comes back',async()=>{
    const {exchangeAuthCode}=await import('../features/auth/auth-service');
    exchangeCodeForSession.mockResolvedValueOnce({data:{session:null},error:new Error('flow state not found')});
    await expect(exchangeAuthCode('code-bad')).rejects.toThrow('Este enlace no es válido o ya venció.');
    exchangeCodeForSession.mockResolvedValueOnce({data:{session:null},error:null});
    await expect(exchangeAuthCode('code-empty')).rejects.toThrow(/ya venció/);
  });
});

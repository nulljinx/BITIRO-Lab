import {requireSupabase} from '../../lib/supabase';
import {rememberOAuthNext,type OAuthFlow} from './auth-navigation';
import {providerFromSession,type SessionProvider} from './signup-flow';
import type {Membership, Profile, SignUpInput, Site} from './auth-types';

export const passwordMinimum = 12;
export function validatePassword(password:string) {
  if (password.length < passwordMinimum || password.length > 128) throw new Error('Usa una contraseña de entre 12 y 128 caracteres.');
}
function displayNameValue(value:string) {
  const name=value.trim();if(name.length<2 || name.length>80) throw new Error('Tu nombre visible debe tener entre 2 y 80 caracteres.');return name;
}
const callbackUrl = (recovery=false) => new URL(recovery?'/auth/callback?recovery=1':'/auth/callback',window.location.origin).href;
export async function fetchSites():Promise<Site[]> {
  const {data,error}=await requireSupabase().from('sites').select('id,name,city,region,partner,organization_id').eq('active',true).order('sort_order').abortSignal(AbortSignal.timeout(15000));
  if(error)throw new Error('No pudimos cargar las sedes. Inténtalo nuevamente.');return data??[];
}
export async function fetchAccount(userId:string):Promise<{profile:Profile;membership:Membership}> {
  const client=requireSupabase();
  const [p,m]=await Promise.all([
    client.from('profiles').select('id,display_name,requested_role,created_at').eq('id',userId).abortSignal(AbortSignal.timeout(15000)).single(),
    client.from('memberships').select('user_id,site_id,role').eq('user_id',userId).abortSignal(AbortSignal.timeout(15000)).single(),
  ]);
  if(p.error||m.error)throw new Error('No pudimos cargar tu perfil y permisos. Reintenta; tu acceso a datos permanece restringido.');
  return {profile:p.data as Profile,membership:m.data as Membership};
}
export async function signIn(email:string,password:string):Promise<void> {
  const {error}=await requireSupabase().auth.signInWithPassword({email:email.trim(),password});
  if(error)throw new Error('No pudimos iniciar sesión. Revisa tu correo y contraseña, o confirma tu cuenta si aún está pendiente.');
}
// Identity only: Supabase's default Google scopes (openid, email, profile). No extra scopes and no provider_token use.
// The role is never sent; accounts always start as participants and are elevated only by server-side rules.
export async function signInWithGoogle(next='/espacios',flow:OAuthFlow='login'):Promise<void> {
  rememberOAuthNext(next,undefined,flow);
  const {error}=await requireSupabase().auth.signInWithOAuth({provider:'google',options:{redirectTo:callbackUrl()}});
  if(error)throw new Error('No pudimos iniciar el acceso con Google. Inténtalo nuevamente o usa tu correo.');
}
export async function signUp(input:SignUpInput):Promise<{confirmationRequired:boolean}> {
  validatePassword(input.password);const display_name=displayNameValue(input.displayName);
  const {data,error}=await requireSupabase().auth.signUp({email:input.email.trim(),password:input.password,options:{emailRedirectTo:callbackUrl(),data:{display_name}}});
  if(error)throw new Error('No pudimos registrar la cuenta. Revisa los datos o solicita recuperar tu contraseña si ya tienes cuenta.');
  return {confirmationRequired:!data.session};
}
export async function resendSignupConfirmation(email:string):Promise<void> {
  const {error}=await requireSupabase().auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:callbackUrl()}});
  if(error)throw new Error('No pudimos reenviar el correo. Inténtalo nuevamente en unos minutos.');
}
// The single owner of the PKCE code exchange (the client is created with detectSessionInUrl:false).
// Calls are memoised per code, so re-renders or StrictMode cannot spend the one-time code twice.
// Resolves with the provider of the resulting session so the callback can pick the right copy.
const exchanges=new Map<string,Promise<{provider:SessionProvider}>>();
export function exchangeAuthCode(code:string):Promise<{provider:SessionProvider}> {
  let task=exchanges.get(code);
  if(!task){
    task=requireSupabase().auth.exchangeCodeForSession(code).then(({data,error})=>{
      if(error||!data.session)throw new Error('Este enlace no es válido o ya venció.');
      return {provider:providerFromSession(data.session)};
    });
    exchanges.set(code,task);
  }
  return task;
}
export async function signOut():Promise<void> {
  const {error}=await requireSupabase().auth.signOut({scope:'local'});if(error)throw new Error('No pudimos cerrar la sesión. Inténtalo nuevamente.');
}
export async function resetPassword(email:string):Promise<void> {
  const {error}=await requireSupabase().auth.resetPasswordForEmail(email.trim(),{redirectTo:callbackUrl(true)});
  if(error)throw new Error('No pudimos enviar la solicitud. Inténtalo nuevamente en unos minutos.');
}
export async function updatePassword(password:string):Promise<void> {
  validatePassword(password);const {error}=await requireSupabase().auth.updateUser({password});if(error)throw new Error('El enlace puede haber vencido o la contraseña no cumple los requisitos. Solicita un nuevo enlace.');
}
export async function updateProfile(displayName:string):Promise<void> {
  const {error}=await requireSupabase().rpc('update_my_profile',{p_display_name:displayNameValue(displayName)});
  if(error)throw new Error('No pudimos actualizar tu nombre visible. Inténtalo nuevamente.');
}

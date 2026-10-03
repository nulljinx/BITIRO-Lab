// Pure decisions for the email sign-up confirmation experience, kept out of React so they can be tested in node.
export const resendCooldownMs=60_000;
export const resendFailureCooldownMs=15_000;
export const verifiedRedirectMs=1600;
export const callbackExpiryMs=20000;

// Shows enough to recognise the address without exposing it in full: a•••@g•••.com
export function maskEmail(email:string):string{
  const value=email.trim(),at=value.lastIndexOf('@');
  if(at<1||at===value.length-1)return '•••';
  const local=value.slice(0,at),domain=value.slice(at+1),dot=domain.lastIndexOf('.');
  const host=dot>0?domain.slice(0,dot):domain,tld=dot>0?domain.slice(dot):'';
  return `${[...local][0]}•••@${[...host][0]}•••${tld}`;
}
export function resendRemainingSeconds(availableAt:number,now:number):number{
  return Math.max(0,Math.ceil((availableAt-now)/1000));
}

export type CallbackSource='google'|'recovery'|'email';
export type SessionProvider='google'|'email'|'unknown';
interface ProviderUser{app_metadata?:{provider?:unknown;providers?:unknown}|null;identities?:Array<{provider?:string;last_sign_in_at?:string|null}>|null}
// UX classification only (copy and navigation), never authorization. Reads app_metadata/identities, never user_metadata.
// A user can hold several identities, so the one that signed in most recently wins, not the first in the array.
export function providerFromSession(session:{user?:ProviderUser|null}|null|undefined):SessionProvider{
  const user=session?.user;if(!user)return 'unknown';
  const stamped=(user.identities??[]).filter(i=>typeof i?.provider==='string'&&i.last_sign_in_at&&!Number.isNaN(Date.parse(i.last_sign_in_at)))
    .sort((x,y)=>Date.parse(y.last_sign_in_at as string)-Date.parse(x.last_sign_in_at as string));
  const provider=stamped[0]?.provider??(typeof user.app_metadata?.provider==='string'?user.app_metadata.provider:null);
  if(provider==='google')return 'google';
  if(provider==='email')return 'email';
  const providers=user.app_metadata?.providers;
  if(Array.isArray(providers)&&providers.length===1)return providers[0]==='google'?'google':providers[0]==='email'?'email':'unknown';
  return 'unknown';
}
// recovery always wins; a valid saved Google state keeps Google; otherwise the exchanged session's provider decides.
export function classifyCallback(input:{recovery:boolean;googleState:unknown;sessionProvider?:SessionProvider}):CallbackSource{
  if(input.recovery)return 'recovery';
  if(input.googleState||input.sessionProvider==='google')return 'google';
  return 'email';
}
export type ExchangeState='idle'|'pending'|'ok'|'error';
export type CallbackView='working'|'verified-redirect'|'redirect'|'invalid';
export interface CallbackInput{
  status:'loading'|'anonymous'|'authenticated'|'unconfigured';
  providerError:boolean;accountError:boolean;
  oauth:boolean;recovery:boolean;hasCode:boolean;
  exchange:ExchangeState;expired:boolean;
}
// "Verified" is only ever claimed after exchangeCodeForSession succeeded AND the auth state is authenticated.
// A code alone, a timeout, or a session that existed beforehand never counts as proof.
export function decideCallbackView(i:CallbackInput):CallbackView{
  if(i.providerError||(i.hasCode&&i.exchange==='error'))return 'invalid';
  if(i.hasCode&&i.exchange!=='ok')return i.expired?'invalid':'working';
  if(i.status==='authenticated')return i.oauth||i.recovery||!i.hasCode?'redirect':'verified-redirect';
  if(i.accountError||i.expired)return 'invalid';
  return 'working';
}

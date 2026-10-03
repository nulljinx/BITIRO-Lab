const allowedNext = [
  /^\/$/,
  /^\/espacios$/,
  /^\/espacios\/[a-z0-9-]+\/grupos\/[a-z0-9-]+$/,
  /^\/espacios\/[a-z0-9-]+\/grupos\/[a-z0-9-]+\/mentor$/,
  /^\/espacios\/[a-z0-9-]+\/grupos\/[a-z0-9-]+\/intermedio\/s0[1-8](?:\?debug=1)?$/,
  // Compatibility redirects from pre-6.3.2 links. They resolve to an explicit cohort only when unambiguous.
  /^\/espacios\/[a-z0-9-]+$/,
  /^\/espacios\/[a-z0-9-]+\/mentor$/,
  /^\/espacios\/[a-z0-9-]+\/intermedio\/s0[1-8](?:\?debug=1)?$/,
  /^\/intermedio(?:\/s0[1-8])?(?:\?debug=1)?$/,
  /^\/(?:recursos|comunidad|privacidad|cuenta|equipo)$/,
];

export function safeNext(value:string|null,fallback='/espacios'){
  if(!value||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return fallback;
  return allowedNext.some(pattern=>pattern.test(value))?value:fallback;
}

// The OAuth round trip cannot carry `next` in redirectTo: Supabase matches redirect URLs exactly against its allowlist.
// The destination is kept in sessionStorage and re-validated with safeNext when the callback consumes it.
export const oauthNextKey='bitiro:oauth-next';
type NextStore=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
function sessionStore():NextStore|null{try{return typeof sessionStorage==='undefined'?null:sessionStorage;}catch{return null;}}
export type OAuthFlow='login'|'register';
export interface GoogleOAuthState{next:string;flow:OAuthFlow;source:'google';at:number}
const oauthNextMaxAge=15*60*1000;
// Stored as JSON {next,flow,source:'google',at}. `source` is what lets /auth/callback recognise a Google round trip;
// older values (plain strings, or objects without source) never identify Google and are read conservatively.
export function rememberOAuthNext(next:string,store:NextStore|null=sessionStore(),flow:OAuthFlow='login',now=Date.now()){
  const state:GoogleOAuthState={next:safeNext(next),flow,source:'google',at:now};
  try{store?.setItem(oauthNextKey,JSON.stringify(state));}catch{/* storage unavailable: callback falls back to /espacios */}
}
function parseGoogleState(raw:string,now:number):GoogleOAuthState|null{
  let entry:Partial<GoogleOAuthState>|null=null;
  try{entry=JSON.parse(raw);}catch{return null;}
  if(!entry||typeof entry!=='object'||entry.source!=='google')return null;
  if(entry.flow!=='login'&&entry.flow!=='register')return null;
  if(typeof entry.at!=='number'||now-entry.at>oauthNextMaxAge||entry.at>now+60000)return null;
  const next=safeNext(typeof entry.next==='string'?entry.next:null);
  // Register never lands on the profile page: /espacios shows the group-code onboarding when there are no workspaces.
  return {next:entry.flow==='register'&&next==='/cuenta'?'/espacios':next,flow:entry.flow,source:'google',at:entry.at};
}
// Legacy plain-string values: only /espacios and its sub-routes are trusted. Anything else (notably /cuenta) is dropped.
function legacyNext(raw:string):string|null{
  const value=raw.trim();
  return value.startsWith('/')&&(value==='/espacios'||value.startsWith('/espacios/'))&&safeNext(value,'')===value?value:null;
}
// Read-only: is this callback a Google round trip started by this browser (valid, unexpired, explicit source)?
export function readGoogleOAuth(store:NextStore|null=sessionStore(),now=Date.now()):GoogleOAuthState|null{
  try{const raw=store?.getItem(oauthNextKey)??null;return raw===null?null:parseGoogleState(raw,now);}catch{return null;}
}
export function consumeOAuthNext(store:NextStore|null=sessionStore(),now=Date.now()):string|null{
  try{
    const raw=store?.getItem(oauthNextKey)??null;store?.removeItem(oauthNextKey);
    if(raw===null)return null;
    return raw.trim().startsWith('{')?parseGoogleState(raw,now)?.next??null:legacyNext(raw);
  }catch{return null;}
}

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
export function rememberOAuthNext(next:string,store:NextStore|null=sessionStore()){
  try{store?.setItem(oauthNextKey,safeNext(next));}catch{/* storage unavailable: callback falls back to /espacios */}
}
export function consumeOAuthNext(store:NextStore|null=sessionStore()):string|null{
  try{
    const value=store?.getItem(oauthNextKey)??null;store?.removeItem(oauthNextKey);
    return value===null?null:safeNext(value);
  }catch{return null;}
}

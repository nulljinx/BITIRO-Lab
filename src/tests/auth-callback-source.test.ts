import {beforeEach,describe,expect,it,vi} from 'vitest';
import {consumeOAuthNext,oauthNextKey,readGoogleOAuth,rememberOAuthNext} from '../features/auth/auth-navigation';
import {classifyCallback,decideCallbackView,providerFromSession,type CallbackInput,type SessionProvider} from '../features/auth/signup-flow';

const exchangeCodeForSession=vi.fn();
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({auth:{exchangeCodeForSession}}),supabase:{}}));
beforeEach(()=>{exchangeCodeForSession.mockReset();exchangeCodeForSession.mockResolvedValue({data:{session:{}},error:null});});

function memoryStore(){const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>void data.set(k,v),removeItem:(k:string)=>void data.delete(k)};}
// What AuthPage does for a callback: classify from storage + ?recovery, then decide the view from the exchange outcome.
function callback(store:ReturnType<typeof memoryStore>,opts:{sessionProvider?:SessionProvider;recovery?:boolean;exchange?:CallbackInput['exchange'];status?:CallbackInput['status']}={}){
  const googleState=readGoogleOAuth(store),source=classifyCallback({recovery:Boolean(opts.recovery),googleState,sessionProvider:opts.sessionProvider});
  const view=decideCallbackView({status:opts.status??'authenticated',providerError:false,accountError:false,oauth:source==='google',recovery:source==='recovery',hasCode:true,exchange:opts.exchange??'ok',expired:false});
  return {source,view,destination:source==='google'?consumeOAuthNext(store):null};
}

describe('callback source classification',()=>{
  it('google/login: Google source, straight navigation, never the e-mail "verified" screen, keeps next',()=>{
    const store=memoryStore();rememberOAuthNext('/espacios/mustakis/grupos/talca-a',store,'login');
    expect(callback(store)).toEqual({source:'google',view:'redirect',destination:'/espacios/mustakis/grupos/talca-a'});
  });
  it('google/register with next=/cuenta ends at /espacios',()=>{
    const store=memoryStore();rememberOAuthNext('/cuenta',store,'register');
    expect(callback(store)).toEqual({source:'google',view:'redirect',destination:'/espacios'});
  });
  it('no valid Google state: a code is an e-mail signup confirmation',()=>{
    const store=memoryStore();
    expect(callback(store)).toMatchObject({source:'email',view:'verified-redirect'});
    expect(callback(store,{exchange:'error',status:'anonymous'})).toMatchObject({source:'email',view:'invalid'});
  });
  it('recovery=1 keeps the recovery flow even if Google state exists',()=>{
    const store=memoryStore();rememberOAuthNext('/espacios',store,'login');
    expect(callback(store,{recovery:true})).toMatchObject({source:'recovery',view:'redirect'});
    expect(callback(memoryStore(),{recovery:true})).toMatchObject({source:'recovery',view:'redirect'});
  });
  it('expired Google state does not classify as Google',()=>{
    const store=memoryStore();rememberOAuthNext('/espacios',store,'login',Date.now()-16*60*1000);
    expect(readGoogleOAuth(store)).toBeNull();expect(callback(store).source).toBe('email');
  });
  it('legacy values never identify Google and are read conservatively',()=>{
    for(const legacy of ['/espacios','/cuenta','{"next":"/espacios","flow":"login","at":'+Date.now()+'}']){
      const store=memoryStore();store.setItem(oauthNextKey,legacy);
      expect(readGoogleOAuth(store)).toBeNull();expect(callback(store).source).toBe('email');
    }
    const cases:Array<[string,string|null]>=[['/cuenta',null],['/espacios','/espacios'],['/espacios/mustakis/grupos/talca-a','/espacios/mustakis/grupos/talca-a'],['/recursos',null],['//evil.example',null],['/espacios/../cuenta',null]];
    for(const [raw,expected] of cases){const store=memoryStore();store.setItem(oauthNextKey,raw);expect(consumeOAuthNext(store)).toBe(expected);}
  });
  it('no Google callback ever reaches the e-mail verification view',()=>{
    for(const flow of ['login','register'] as const)for(const exchange of ['idle','pending','ok','error'] as const)for(const status of ['loading','anonymous','authenticated'] as const){
      const store=memoryStore();rememberOAuthNext('/espacios',store,flow);
      expect(callback(store,{exchange,status}).view).not.toBe('verified-redirect');
    }
  });
});

describe('code exchange runs once per flow',()=>{
  it.each(['google','email'])('%s callback spends the code a single time',async flow=>{
    const {exchangeAuthCode}=await import('../features/auth/auth-service');
    const code=`code-${flow}`;
    await Promise.all([exchangeAuthCode(code),exchangeAuthCode(code)]);
    await exchangeAuthCode(code);
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
});

const sessionOf=(user:object)=>({user});
describe('post-exchange provider classification',()=>{
  it('no sessionStorage + exchange says google: Google, no e-mail "verified", /espacios fallback',async()=>{
    exchangeCodeForSession.mockResolvedValue({data:{session:sessionOf({app_metadata:{provider:'google',providers:['google']},identities:[{provider:'google',last_sign_in_at:'2026-01-01T00:00:00Z'}]})},error:null});
    const {exchangeAuthCode}=await import('../features/auth/auth-service');
    const {provider}=await exchangeAuthCode('code-no-storage');
    expect(provider).toBe('google');
    const blocked={getItem:()=>{throw new Error('blocked');},setItem:()=>{},removeItem:()=>{}};
    const result=callback(blocked as never,{sessionProvider:provider});
    expect(result).toEqual({source:'google',view:'redirect',destination:null});
    // AuthPage navigates with `stored ?? next`, where next defaults to /espacios
    expect(result.destination??'/espacios').toBe('/espacios');
  });
  it('expired Google state + exchange says google: still Google',()=>{
    const store=memoryStore();rememberOAuthNext('/cuenta',store,'register',Date.now()-16*60*1000);
    expect(callback(store,{sessionProvider:'google'})).toMatchObject({source:'google',view:'redirect'});
  });
  it('exchange says email: e-mail confirmation flow',async()=>{
    exchangeCodeForSession.mockResolvedValue({data:{session:sessionOf({app_metadata:{provider:'email',providers:['email']},identities:[{provider:'email',last_sign_in_at:'2026-01-01T00:00:00Z'}]})},error:null});
    const {exchangeAuthCode}=await import('../features/auth/auth-service');
    const {provider}=await exchangeAuthCode('code-email');
    expect(callback(memoryStore(),{sessionProvider:provider})).toMatchObject({source:'email',view:'verified-redirect'});
  });
  it('recovery=1 beats a google session and a google state',()=>{
    const store=memoryStore();rememberOAuthNext('/espacios',store,'login');
    expect(callback(store,{recovery:true,sessionProvider:'google'})).toMatchObject({source:'recovery',view:'redirect'});
  });
  it('multiple identities: the most recent sign-in decides, not array order',()=>{
    const email={provider:'email',last_sign_in_at:'2026-01-01T00:00:00Z'},google={provider:'google',last_sign_in_at:'2026-03-01T00:00:00Z'};
    for(const identities of [[email,google],[google,email]]){
      expect(providerFromSession(sessionOf({app_metadata:{provider:'email',providers:['email','google']},identities}))).toBe('google');
    }
    const older={...google,last_sign_in_at:'2025-01-01T00:00:00Z'};
    expect(providerFromSession(sessionOf({app_metadata:{provider:'google',providers:['google','email']},identities:[older,email]}))).toBe('email');
  });
  it('ignores user_metadata and returns unknown when nothing identifies the provider',()=>{
    expect(providerFromSession(sessionOf({user_metadata:{provider:'google'},app_metadata:{}}))).toBe('unknown');
    expect(providerFromSession(null)).toBe('unknown');
    expect(providerFromSession(sessionOf({app_metadata:{providers:['email','google']}}))).toBe('unknown');
  });
});

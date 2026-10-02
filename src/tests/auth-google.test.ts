import {beforeEach,describe,expect,it,vi} from 'vitest';
import {consumeOAuthNext,oauthNextKey,rememberOAuthNext} from '../features/auth/auth-navigation';

const signInWithOAuth=vi.fn();
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({auth:{signInWithOAuth}}),supabase:{}}));

function memoryStore(){const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>void data.set(k,v),removeItem:(k:string)=>void data.delete(k),data};}

describe('Google OAuth sign-in',()=>{
  beforeEach(()=>{signInWithOAuth.mockReset();signInWithOAuth.mockResolvedValue({error:null});vi.stubGlobal('window',{location:{origin:'https://bitiro.test'}});vi.stubGlobal('sessionStorage',memoryStore());});
  it('uses the exact callback URL, default scopes and never sends role data',async()=>{
    const {signInWithGoogle}=await import('../features/auth/auth-service');
    await signInWithGoogle('/espacios');
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    const arg=signInWithOAuth.mock.calls[0][0];
    expect(arg.provider).toBe('google');
    expect(arg.options).toEqual({redirectTo:'https://bitiro.test/auth/callback'});
    expect(JSON.stringify(arg)).not.toMatch(/scopes|queryParams|role|metadata|data/i);
  });
  it('stores only a safe destination for the callback and clears it once consumed',async()=>{
    const {signInWithGoogle}=await import('../features/auth/auth-service');
    await signInWithGoogle('/espacios/mustakis/grupos/talca-a/intermedio/s01');
    expect(consumeOAuthNext()).toBe('/espacios/mustakis/grupos/talca-a/intermedio/s01');
    expect(consumeOAuthNext()).toBeNull();
  });
  it('rewrites unsafe destinations and ignores tampered storage',()=>{
    const store=memoryStore();
    rememberOAuthNext('https://evil.example',store);expect(consumeOAuthNext(store)).toBe('/espacios');
    store.setItem(oauthNextKey,'//evil.example');expect(consumeOAuthNext(store)).toBe('/espacios');
    expect(consumeOAuthNext(store)).toBeNull();
  });
  it('surfaces a generic error when the provider call fails',async()=>{
    signInWithOAuth.mockResolvedValue({error:new Error('provider is not enabled')});
    const {signInWithGoogle}=await import('../features/auth/auth-service');
    await expect(signInWithGoogle()).rejects.toThrow(/Google/);
  });
});

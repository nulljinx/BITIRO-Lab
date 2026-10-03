import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {supabase} from '../../lib/supabase';
import type {AuthContextValue,AuthStatus,Membership,Profile,Site} from './auth-types';
import * as service from './auth-service';
import {initialSites} from '../../content/sites';

const AuthContext=createContext<AuthContextValue|null>(null);
export function AuthProvider({children}:{children:ReactNode}) {
  const [status,setStatus]=useState<AuthStatus>(supabase?'loading':'unconfigured');
  const [user,setUser]=useState<User|null>(null),[profile,setProfile]=useState<Profile|null>(null),[membership,setMembership]=useState<Membership|null>(null);
  const [sites,setSites]=useState<Site[]>(supabase?[]:initialSites),[error,setError]=useState<string|null>(null);
  const generation=useRef(0),currentUser=useRef<User|null>(null),profileLoaded=useRef(false),pendingAccount=useRef<Promise<void>|null>(null);
  const loadAccount=useCallback(async(next:User|null,force=false)=>{
    setUser(next);
    if(!force && next && next.id===currentUser.current?.id && (profileLoaded.current||pendingAccount.current))return pendingAccount.current??undefined;
    const turn=++generation.current;currentUser.current=next;profileLoaded.current=false;setProfile(null);setMembership(null);setError(null);
    if(!next){setStatus(supabase?'anonymous':'unconfigured');return;}
    setStatus('loading');
    const task=(async()=>{
      try {const account=await service.fetchAccount(next.id);if(turn!==generation.current)return;setProfile(account.profile);setMembership(account.membership);profileLoaded.current=true;}
      catch(err){if(turn!==generation.current)return;setError(err instanceof Error?err.message:'No pudimos cargar tu perfil.');}
      if(turn===generation.current){setStatus('authenticated');pendingAccount.current=null;}
    })();pendingAccount.current=task;await task;
  },[]);
  useEffect(()=>{
    if(!supabase)return;let active=true;
    service.fetchSites().then(value=>{if(active)setSites(value);}).catch(err=>{if(active)setError(err.message);});
    const initializationTimeout=setTimeout(()=>{if(active && !currentUser.current){setStatus('anonymous');setError('La conexión de cuentas está tardando demasiado. Puedes reintentar o seguir como visitante.');}},15000);
    // The callback must not await Supabase calls while its auth lock is held.
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      clearTimeout(initializationTimeout);
      setTimeout(()=>{if(active)void loadAccount(session?.user??null);},0);
    });
    return()=>{active=false;clearTimeout(initializationTimeout);generation.current++;pendingAccount.current=null;subscription.unsubscribe();};
  },[loadAccount]);
  const refreshProfile=useCallback(async()=>{await loadAccount(currentUser.current,true);},[loadAccount]);
  const value:AuthContextValue={status,user,profile,membership,sites,error,
    signIn:service.signIn,signInWithGoogle:service.signInWithGoogle,signUp:service.signUp,resendSignupConfirmation:service.resendSignupConfirmation,exchangeAuthCode:service.exchangeAuthCode,
    signOut:async()=>{await service.signOut();await loadAccount(null);},
    resetPassword:service.resetPassword,updatePassword:service.updatePassword,
    updateProfile:async(name)=>{await service.updateProfile(name);await refreshProfile();},refreshProfile};
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth():AuthContextValue {
  const value=useContext(AuthContext);if(!value)throw new Error('useAuth debe usarse dentro de AuthProvider.');return value;
}

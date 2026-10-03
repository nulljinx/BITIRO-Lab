import type {User} from '@supabase/supabase-js';
export type Role = 'participant' | 'facilitator' | 'admin';
export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'unconfigured';
export interface Site {id:string; name:string; city:string; region:string; partner:string; organization_id?:string}
export interface Profile {id:string; display_name:string; requested_role?:'participant'|'facilitator'; created_at?:string}
export interface Membership {user_id:string; site_id:string|null; role:Role}
export interface SignUpInput {email:string; password:string; displayName:string}
export interface AuthContextValue {
  status:AuthStatus; user:User|null; profile:Profile|null; membership:Membership|null; sites:Site[]; error:string|null;
  signIn:(email:string,password:string)=>Promise<void>;
  signInWithGoogle:(next?:string,flow?:'login'|'register')=>Promise<void>;
  signUp:(input:SignUpInput)=>Promise<{confirmationRequired:boolean}>;
  resendSignupConfirmation:(email:string)=>Promise<void>;
  exchangeAuthCode:(code:string)=>Promise<{provider:'google'|'email'|'unknown'}>;
  signOut:()=>Promise<void>;
  resetPassword:(email:string)=>Promise<void>;
  updatePassword:(password:string)=>Promise<void>;
  updateProfile:(displayName:string)=>Promise<void>;
  refreshProfile:()=>Promise<void>;
}


import {createClient} from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim();
// Only public project keys belong in a browser bundle. Never accept a service key.
function isPublicKey(value: string): boolean {
  if (value.startsWith('sb_publishable_')) return true;
  try {
    const payload = JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'anon';
  } catch { return false; }
}
function validUrl(value: string): boolean {
  try {const parsed = new URL(value);return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost','127.0.0.1'].includes(parsed.hostname));} catch {return false;}
}
export const authConfigured = Boolean(url && key && validUrl(url) && isPublicKey(key));
export const supabase = authConfigured ? createClient(url!, key!, {
  global:{fetch:(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)})},
  auth: {flowType:'pkce', detectSessionInUrl:false, persistSession:true, autoRefreshToken:true},
}) : null;
export function requireSupabase() {
  if (!supabase) throw new Error('Las cuentas todavía no están configuradas. Los espacios institucionales requieren una cuenta BITIRO autenticada.');
  return supabase;
}

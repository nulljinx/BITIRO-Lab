import {requireSupabase} from '../../lib/supabase';
import type {Membership,Profile,Role,Site} from '../auth/auth-types';
export interface AdminMember {profile:Profile; membership:Membership; site:Site|null}
export interface MembersPage {members:AdminMember[];total:number}
export async function listMembersPage(options:{limit?:number;offset?:number;query?:string;siteId?:string}={}):Promise<MembersPage> {
  const {data,error}=await requireSupabase().rpc('list_visible_members',{
    p_limit:Math.min(100,Math.max(1,options.limit??25)),p_offset:Math.max(0,options.offset??0),
    p_query:(options.query??'').slice(0,80),p_site_id:options.siteId||null,
  }).abortSignal(AbortSignal.timeout(15000));
  if(error)throw new Error('No pudimos cargar los participantes. Revisa tus permisos e inténtalo nuevamente.');
  return data as MembersPage;
}
export async function listMembers():Promise<AdminMember[]> {
  return (await listMembersPage({limit:100})).members;
}
export async function updateMember(input:{userId:string;siteId:string;role:Role}):Promise<void> {
  const {error}=await requireSupabase().rpc('admin_update_membership',{p_user_id:input.userId,p_site_id:input.siteId,p_role:input.role});
  if(error)throw new Error('No se pudo cambiar el rol o la sede. Necesitas permisos de administración; no puedes degradar al último administrador.');
}

import {requireSupabase} from '../../lib/supabase';
import type {CohortLearningRow,MentorWorkspaceOverview,ParticipantInvite,WorkspaceParticipant,WorkspaceSessionAccess,WorkspaceSummary} from './workspace-types';

export async function listMyWorkspaces():Promise<WorkspaceSummary[]> {
  const {data,error}=await requireSupabase().rpc('list_my_workspaces').abortSignal(AbortSignal.timeout(15000));
  if(error)throw new Error('No pudimos cargar tus espacios. Inténtalo nuevamente.');
  return (data??[]) as WorkspaceSummary[];
}

export async function redeemWorkspaceCode(code:string):Promise<WorkspaceSummary> {
  const normalized=code.trim().toUpperCase();
  if(normalized.length<8||normalized.length>64)throw new Error('Código no válido o no disponible.');
  const {data,error}=await requireSupabase().rpc('redeem_workspace_code',{p_code:normalized}).abortSignal(AbortSignal.timeout(15000));
  if(error||!data)throw new Error('Código no válido o no disponible. Solicita uno nuevo a tu mentor.');
  const result=data as {ok?:boolean;workspace?:WorkspaceSummary};
  if(!result.ok||!result.workspace)throw new Error('Código no válido o no disponible. Solicita uno nuevo a tu mentor.');
  return result.workspace;
}

export async function listWorkspaceSessions(workspace:WorkspaceSummary):Promise<WorkspaceSessionAccess[]> {
  const {data,error}=await requireSupabase().rpc('list_workspace_sessions',{p_cohort_id:workspace.cohort_id}).abortSignal(AbortSignal.timeout(15000));
  if(error)throw new Error('No pudimos comprobar qué contenidos están habilitados.');
  return (data??[]) as WorkspaceSessionAccess[];
}

export async function setWorkspaceSessionRelease(workspace:WorkspaceSummary,sessionId:string,released:boolean):Promise<void> {
  if(!workspace.can_manage)throw new Error('Necesitas permisos de mentor.');
  const {error}=await requireSupabase().rpc('mentor_set_session_release',{p_cohort_id:workspace.cohort_id,p_session_id:sessionId,p_released:released}).abortSignal(AbortSignal.timeout(15000));
  if(error)throw new Error('No pudimos actualizar la disponibilidad de esta sesión.');
}

export async function getMentorWorkspaceOverview(workspace:WorkspaceSummary):Promise<MentorWorkspaceOverview> {
  if(!workspace.can_manage)throw new Error('Necesitas permisos de mentor.');
  const {data,error}=await requireSupabase().rpc('mentor_workspace_overview',{p_cohort_id:workspace.cohort_id}).abortSignal(AbortSignal.timeout(15000));
  if(error||!data)throw new Error('No pudimos cargar el resumen del grupo.');
  return data as MentorWorkspaceOverview;
}


export async function getParticipantInvite(workspace:WorkspaceSummary):Promise<ParticipantInvite|null> {
  if(!workspace.can_manage)throw new Error('Necesitas permisos de mentor.');
  const {data,error}=await requireSupabase().rpc('mentor_get_participant_invite',{p_cohort_id:workspace.cohort_id}).abortSignal(AbortSignal.timeout(15000));
  if(error)throw new Error('No pudimos cargar el código de participantes.');
  return data?data as ParticipantInvite:null;
}

export async function createParticipantInvite(workspace:WorkspaceSummary,maxUses:number,validDays:number):Promise<ParticipantInvite> {
  if(!workspace.can_manage)throw new Error('Necesitas permisos de mentor.');
  const uses=Math.trunc(maxUses),days=Math.trunc(validDays);
  if(uses<1||uses>200||days<1||days>60)throw new Error('Revisa los cupos y la vigencia del código.');
  const {data,error}=await requireSupabase().rpc('mentor_create_participant_invite',{p_cohort_id:workspace.cohort_id,p_max_uses:uses,p_valid_days:days}).abortSignal(AbortSignal.timeout(15000));
  if(error||!data)throw new Error('No pudimos crear el código de participantes.');
  return data as ParticipantInvite;
}

export async function revokeParticipantInvite(workspace:WorkspaceSummary):Promise<void> {
  if(!workspace.can_manage)throw new Error('Necesitas permisos de mentor.');
  const {error}=await requireSupabase().rpc('mentor_revoke_participant_invite',{p_cohort_id:workspace.cohort_id}).abortSignal(AbortSignal.timeout(15000));
  if(error)throw new Error('No pudimos revocar el código de participantes.');
}

export async function listWorkspaceParticipants(workspace:WorkspaceSummary):Promise<WorkspaceParticipant[]> {
  if(!workspace.can_manage)throw new Error('Necesitas permisos de mentor.');
  const {data,error}=await requireSupabase().rpc('mentor_list_participants',{p_cohort_id:workspace.cohort_id}).abortSignal(AbortSignal.timeout(15000));
  if(error)throw new Error('No pudimos cargar los participantes del grupo.');
  return (data??[]) as WorkspaceParticipant[];
}

export async function listCohortLearning(workspace:WorkspaceSummary):Promise<CohortLearningRow[]> {
 if(!workspace.can_manage)throw new Error('Necesitas permisos de mentor.');
 const {data,error}=await requireSupabase().rpc('mentor_cohort_learning',{
  p_cohort_id:workspace.cohort_id,p_version:1
 }).abortSignal(AbortSignal.timeout(15000));
 if(error)throw new Error('No pudimos cargar el avance del grupo.');
 return (data??[]) as CohortLearningRow[];
}

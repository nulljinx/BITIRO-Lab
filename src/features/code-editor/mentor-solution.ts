import {requireSupabase} from '../../lib/supabase';

// The reference solution is NEVER part of the bundle. The database decides who may read it
// (private.can_manage_cohort inside public.mentor_get_solution); the UI only asks when the mentor opens the panel.
export interface MentorSolution {session_id:string;title:string;note:string;source:string;revision:number}
export const MENTOR_SOLUTION_ERROR='No se pudo cargar la solución.';

function isMentorSolution(value:unknown):value is MentorSolution {
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 return typeof v.session_id==='string'&&typeof v.title==='string'&&typeof v.note==='string'&&typeof v.source==='string'&&typeof v.revision==='number';
}

/** Every failure (permission, missing row, network, malformed reply) surfaces as the same generic message. */
export async function fetchMentorSolution(cohortId:string,sessionId:string,signal?:AbortSignal):Promise<MentorSolution> {
 try{
  const request=requireSupabase().rpc('mentor_get_solution',{p_cohort_id:cohortId,p_session_id:sessionId});
  const {data,error}=await (signal?request.abortSignal(signal):request);
  if(error||!isMentorSolution(data))throw new Error(MENTOR_SOLUTION_ERROR);
  return data;
 }catch{throw new Error(MENTOR_SOLUTION_ERROR);}
}

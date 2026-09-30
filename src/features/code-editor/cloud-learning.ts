import {requireSupabase} from '../../lib/supabase';
import {isSupportedSource} from '../../simulator/runtime/source-size';
import type {MissionEvidence} from '../../simulator/MissionEvaluator';

export interface CloudDocument {source:string;revision:number;updated_at:string}
export type LearningStatus='visited'|'attempted'|'completed';
export interface CloudProgress {status:LearningStatus;updated_at:string}
export interface CloudLearning {document:CloudDocument|null;progress:CloudProgress|null}
export interface CloudContext {cohortId:string;userId:string;activityVersion:number}

// The database checks membership and release on EVERY RPC. A local scope or route is never authority.
export async function fetchCloudLearning(context:CloudContext,sessionId:string):Promise<CloudLearning> {
 const {data,error}=await requireSupabase().rpc('get_my_cohort_learning',{
  p_cohort_id:context.cohortId,p_session_id:sessionId,p_version:context.activityVersion
 });
 if(error)throw new Error('No pudimos consultar el documento en la nube.');
 return data as CloudLearning;
}
export async function saveCloudCode(context:CloudContext,sessionId:string,source:string,expectedRevision:number):Promise<{ok:boolean;revision?:number}> {
 if(!isSupportedSource(source))throw new Error('El programa supera el tamaño permitido.');
 const {data,error}=await requireSupabase().rpc('save_my_cohort_code',{
  p_cohort_id:context.cohortId,p_session_id:sessionId,p_source:source,
  p_expected_revision:expectedRevision,p_version:context.activityVersion
 });
 if(error)throw new Error('No se pudo sincronizar. Conservamos la copia local.');
 return data as {ok:boolean;revision?:number};
}
export async function markCloudActivity(context:CloudContext,sessionId:string,event:Exclude<LearningStatus,'completed'>):Promise<LearningStatus>{
 const {data,error}=await requireSupabase().rpc('mark_my_cohort_activity',{
  p_cohort_id:context.cohortId,p_session_id:sessionId,p_event:event,p_version:context.activityVersion
 });
 if(error)throw new Error('No pudimos actualizar el avance en la nube.');
 return data as LearningStatus;
}

/** Browser-formative only; this is not a server-verified exam or mentor grade. */
export async function submitFormativeMission(context:CloudContext,evidence:MissionEvidence):Promise<void>{
 if(evidence.status!=='completed'||evidence.checks.length!==4||!evidence.checks.every(check=>check.passed))throw new Error('La misión no cumple los objetivos.');
 const {data,error}=await requireSupabase().rpc('submit_my_formative_mission',{
  p_cohort_id:context.cohortId,p_session_id:evidence.sessionId,p_version:context.activityVersion,p_evidence:evidence
 });
 if(error||data!=='completed')throw new Error('No pudimos sincronizar el resultado. La evaluación local sigue disponible.');
}

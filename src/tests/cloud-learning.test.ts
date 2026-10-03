import {beforeEach,describe,expect,it,vi} from 'vitest';

const rpc=vi.fn();
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({rpc})}));

import {fetchCloudLearning,markCloudActivity,saveCloudCode,submitFormativeMission,type CloudContext} from '../features/code-editor/cloud-learning';
import {LIMITS} from '../simulator/runtime/runtime-limits';
import type {MissionEvidence} from '../simulator/MissionEvaluator';

const context:CloudContext={cohortId:'c1',userId:'u1',activityVersion:3};
const evidence=(patch:Partial<MissionEvidence>={}):MissionEvidence=>({
 sessionId:'s02',status:'completed',checks:[1,2,3,4].map(n=>({key:`k${n}`,label:'',passed:true})),...patch
} as unknown as MissionEvidence);

beforeEach(()=>rpc.mockReset());

describe('cloud-learning RPC contract',()=>{
 it('fetches the document with cohort, session and activity version, and returns data untouched',async()=>{
  const payload={document:{source:'x',revision:4,updated_at:'t'},progress:null};
  rpc.mockResolvedValue({data:payload,error:null});
  await expect(fetchCloudLearning(context,'s01')).resolves.toBe(payload);
  expect(rpc).toHaveBeenCalledWith('get_my_cohort_learning',{p_cohort_id:'c1',p_session_id:'s01',p_version:3});
 });
 it('surfaces fetch failure as a generic error',async()=>{
  rpc.mockResolvedValue({data:null,error:{message:'secret db detail'}});
  await expect(fetchCloudLearning(context,'s01')).rejects.toThrow('No pudimos consultar el documento en la nube.');
 });
 it('saves with the expected revision (compare-and-swap input)',async()=>{
  rpc.mockResolvedValue({data:{ok:true,revision:8},error:null});
  await expect(saveCloudCode(context,'s01','code',7)).resolves.toEqual({ok:true,revision:8});
  expect(rpc).toHaveBeenCalledWith('save_my_cohort_code',{p_cohort_id:'c1',p_session_id:'s01',p_source:'code',p_expected_revision:7,p_version:3});
 });
 it('returns a rejected save (revision conflict) as data, not as an exception',async()=>{
  rpc.mockResolvedValue({data:{ok:false},error:null});
  const result=await saveCloudCode(context,'s01','code',7);
  expect(result.ok).toBe(false);
  expect(result.revision).toBeUndefined();
 });
 it('throws a message that promises the local copy on transport failure',async()=>{
  rpc.mockResolvedValue({data:null,error:{message:'x'}});
  await expect(saveCloudCode(context,'s01','code',0)).rejects.toThrow('Conservamos la copia local');
 });
 it('refuses oversized source before any network call',async()=>{
  await expect(saveCloudCode(context,'s01','a'.repeat(LIMITS.sourceBytes+1),0)).rejects.toThrow('El programa supera el tamaño permitido.');
  expect(rpc).not.toHaveBeenCalled();
 });
 it('marks activity and returns the server status',async()=>{
  rpc.mockResolvedValue({data:'attempted',error:null});
  await expect(markCloudActivity(context,'s01','attempted')).resolves.toBe('attempted');
  expect(rpc).toHaveBeenCalledWith('mark_my_cohort_activity',{p_cohort_id:'c1',p_session_id:'s01',p_event:'attempted',p_version:3});
  rpc.mockResolvedValue({data:null,error:{message:'x'}});
  await expect(markCloudActivity(context,'s01','visited')).rejects.toThrow('No pudimos actualizar el avance en la nube.');
 });
});

describe('submitFormativeMission client guard',()=>{
 it('submits completed evidence with all checks passed',async()=>{
  rpc.mockResolvedValue({data:'completed',error:null});
  const e=evidence();
  await expect(submitFormativeMission(context,e)).resolves.toBeUndefined();
  expect(rpc).toHaveBeenCalledWith('submit_my_formative_mission',{p_cohort_id:'c1',p_session_id:'s02',p_version:3,p_evidence:e});
 });
 it.each([
  ['not completed',evidence({status:'in_progress'} as Partial<MissionEvidence>)],
  ['no checks',evidence({checks:[]} as Partial<MissionEvidence>)],
  ['one failed check',evidence({checks:[true,true,true,false].map((passed,n)=>({key:`k${n}`,label:'',passed}))} as Partial<MissionEvidence>)],
 ])('rejects locally without calling the server: %s',async(_name,e)=>{
  await expect(submitFormativeMission(context,e)).rejects.toThrow('La misión no cumple los objetivos.');
  expect(rpc).not.toHaveBeenCalled();
 });
 it.each(['s03','s04','s05'])('accepts completed %s evidence',async sessionId=>{
  rpc.mockResolvedValue({data:'completed',error:null});
  const e=evidence({sessionId} as Partial<MissionEvidence>);
  await expect(submitFormativeMission(context,e)).resolves.toBeUndefined();
  expect(rpc).toHaveBeenCalledWith('submit_my_formative_mission',{p_cohort_id:'c1',p_session_id:sessionId,p_version:3,p_evidence:e});
 });
 it('fails when the server does not answer "completed"',async()=>{
  rpc.mockResolvedValue({data:'attempted',error:null});
  await expect(submitFormativeMission(context,evidence())).rejects.toThrow('La evaluación local sigue disponible');
  rpc.mockResolvedValue({data:null,error:{message:'x'}});
  await expect(submitFormativeMission(context,evidence())).rejects.toThrow('La evaluación local sigue disponible');
 });
});

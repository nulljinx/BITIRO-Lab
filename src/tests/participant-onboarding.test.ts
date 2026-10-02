import {beforeEach,describe,expect,it,vi} from 'vitest';
import {decideSpacesEntry} from '../app/route-decisions';

const rpc=vi.fn();
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({rpc:(...args:unknown[])=>({abortSignal:()=>rpc(...args)})})}));
const workspace={id:'c1',organization_id:'mustakis',cohort_id:'c1',role:'participant',can_manage:false};

describe('participant cohort onboarding',()=>{
  beforeEach(()=>rpc.mockReset());
  it('sends only the normalised code to the participant-only RPC',async()=>{
    rpc.mockResolvedValue({data:{ok:true,workspace},error:null});
    const {redeemWorkspaceCode}=await import('../features/workspaces/workspace-service');
    await expect(redeemWorkspaceCode('  abcd-1234-efgh ')).resolves.toEqual(workspace);
    expect(rpc).toHaveBeenCalledWith('redeem_participant_code',{p_code:'ABCD-1234-EFGH'});
    expect(Object.keys(rpc.mock.calls[0][1])).toEqual(['p_code']);
  });
  it('gives one generic error for refused, empty or malformed redemptions',async()=>{
    const {redeemWorkspaceCode}=await import('../features/workspaces/workspace-service');
    rpc.mockResolvedValue({data:{ok:false},error:null});await expect(redeemWorkspaceCode('ABCD-1234-EFGH')).rejects.toThrow(/no válido o no disponible/);
    rpc.mockResolvedValue({data:null,error:{message:'boom'}});await expect(redeemWorkspaceCode('ABCD-1234-EFGH')).rejects.toThrow(/no válido o no disponible/);
    await expect(redeemWorkspaceCode('short')).rejects.toThrow(/no válido/);
  });
  it('routes an authenticated account by membership: none shows the code screen, one enters its cohort',()=>{
    expect(decideSpacesEntry({status:'authenticated',workspacesLoading:false,workspaceCount:0})).toEqual({kind:'render'});
    expect(decideSpacesEntry({status:'authenticated',workspacesLoading:false,workspaceCount:1})).toEqual({kind:'redirect-sole-workspace'});
    expect(decideSpacesEntry({status:'authenticated',workspacesLoading:true,workspaceCount:0})).toEqual({kind:'loading'});
  });
});

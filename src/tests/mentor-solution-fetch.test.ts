import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

const rpc=vi.fn();
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({rpc}),supabase:null}));
import {fetchMentorSolution,MENTOR_SOLUTION_ERROR} from '../features/code-editor/mentor-solution';

// TEST-ONLY payload: never a real solution.
const REPLY={session_id:'s01',title:'TEST-ONLY',note:'TEST-ONLY',source:'// TEST-ONLY',revision:1};
const reply=(result:{data:unknown;error:unknown})=>{
  const builder:{abortSignal:ReturnType<typeof vi.fn>;then:(f:(v:unknown)=>unknown)=>Promise<unknown>}={abortSignal:vi.fn(),then:f=>Promise.resolve(result).then(f)};
  builder.abortSignal.mockReturnValue(builder);
  rpc.mockReturnValue(builder);
  return builder;
};

describe('fetchMentorSolution (mocked RPC)',()=>{
  const storage={getItem:vi.fn(),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn(),key:vi.fn(),length:0};
  const log=vi.spyOn(console,'log').mockImplementation(()=>{}),warn=vi.spyOn(console,'warn').mockImplementation(()=>{}),err=vi.spyOn(console,'error').mockImplementation(()=>{});
  beforeEach(()=>{rpc.mockReset();Object.values(storage).forEach(f=>typeof f==='function'&&'mockClear' in f&&f.mockClear());vi.stubGlobal('localStorage',storage);vi.stubGlobal('sessionStorage',storage);log.mockClear();warn.mockClear();err.mockClear();});
  afterEach(()=>vi.unstubAllGlobals());

  it('asks the RPC only with cohort and session and returns the payload',async()=>{
    reply({data:REPLY,error:null});
    await expect(fetchMentorSolution('cohort-x','s01')).resolves.toEqual(REPLY);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('mentor_get_solution',{p_cohort_id:'cohort-x',p_session_id:'s01'});
  });
  it('forwards the abort signal so closing the panel cancels the request',async()=>{
    const builder=reply({data:REPLY,error:null});
    const controller=new AbortController();
    await fetchMentorSolution('cohort-x','s01',controller.signal);
    expect(builder.abortSignal).toHaveBeenCalledWith(controller.signal);
  });
  it.each([
    ['permission error',{data:null,error:{code:'42501',message:'Mentor permission required'}}],
    ['missing solution',{data:null,error:{code:'P0002',message:'Solution not available'}}],
    ['malformed reply',{data:{session_id:'s01',title:'x'},error:null}],
    ['empty reply',{data:null,error:null}],
  ])('%s surfaces only the generic message',async(_,result)=>{
    reply(result);
    await expect(fetchMentorSolution('cohort-x','s01')).rejects.toThrow(MENTOR_SOLUTION_ERROR);
    await expect(fetchMentorSolution('cohort-x','s01')).rejects.not.toThrow(/permission|P0002|42501/);
  });
  it('network failures are generic too',async()=>{
    rpc.mockImplementation(()=>{throw new Error('socket hang up');});
    await expect(fetchMentorSolution('cohort-x','s01')).rejects.toThrow(MENTOR_SOLUTION_ERROR);
  });
  it('never touches web storage and never logs the source',async()=>{
    reply({data:REPLY,error:null});
    await fetchMentorSolution('cohort-x','s01');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem).not.toHaveBeenCalled();
    for(const spy of [log,warn,err])expect(spy).not.toHaveBeenCalled();
  });
});

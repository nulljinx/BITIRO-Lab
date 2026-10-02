import {describe,expect,it} from 'vitest';
import type {MissionEvidence} from '../simulator/MissionEvaluator';
import {deriveMissionView} from '../features/simulator/mission-state';

const evidence=(passed:boolean[],status:MissionEvidence['status']='in_progress'):MissionEvidence=>({sessionId:'s03',status,checks:passed.map((value,index)=>({key:`k${index}`,label:`Objetivo ${index}`,passed:value})),elapsedMs:0,finishZone:null,kind:'formative_client_simulation'});
const none=[false,false,false,false],all=[true,true,true,true];

describe('mission view derivation',()=>{
  it('a passed attempt always reports every objective as met',()=>{
    const view=deriveMissionView({evidence:evidence(all,'completed'),status:'idle',ticks:900,previouslyPassed:false});
    expect(view).toMatchObject({phase:'passed',passed:4,total:4,badge:'Superada en este intento'});
  });
  it('never labels "superada" when the counter disagrees (the audited 0/4 contradiction)',()=>{
    const view=deriveMissionView({evidence:evidence(none,'completed'),status:'idle',ticks:900,previouslyPassed:false});
    expect(view.phase).not.toBe('passed');
    expect(view.badge).not.toMatch(/Superada/);
    expect(view.passed).toBe(0);
  });
  it.each([
    ['running','running',50,'Intento en curso'],
    ['paused','running',50,'Intento en curso'],
    ['idle','stopped',50,'Intento detenido'],
    ['finished','ended',50,'Programa terminado'],
    ['error','error',0,'Con errores'],
    ['idle','ready',0,'Ver objetivos'],
  ] as const)('status %s is phase %s with its own badge',(status,phase,ticks,badge)=>{
    expect(deriveMissionView({evidence:evidence([true,false,false,false]),status,ticks,previouslyPassed:false})).toMatchObject({phase,badge,passed:1,total:4});
  });
  it('distinguishes passed, stopped and reset states from each other',()=>{
    const states=[
      deriveMissionView({evidence:evidence(all,'completed'),status:'running',ticks:10,previouslyPassed:false}),
      deriveMissionView({evidence:evidence(none),status:'idle',ticks:10,previouslyPassed:true}),
      deriveMissionView({evidence:evidence(none),status:'idle',ticks:0,previouslyPassed:true}),
    ];
    expect(new Set(states.map(state=>state.badge)).size).toBe(3);
  });
  it('a new attempt after a pass keeps the earlier result visible instead of erasing it',()=>{
    const reset=deriveMissionView({evidence:evidence(none),status:'idle',ticks:0,previouslyPassed:true});
    expect(reset.badge).toBe('Reiniciada · nuevo intento');
    expect(reset.note).toMatch(/Ya superaste esta misión/);
    expect(deriveMissionView({evidence:evidence(none),status:'running',ticks:5,previouslyPassed:true}).note).toMatch(/no borra ese resultado/);
    expect(deriveMissionView({evidence:evidence(none),status:'idle',ticks:0,previouslyPassed:false}).note).toBeNull();
  });
});

import {it,expect} from 'vitest';
import {SimulationEngine} from '../../simulator/SimulationEngine';
import {ProgramRuntime} from '../../simulator/runtime/ProgramRuntime';
import {trackForSession} from '../../content/tracks';
import {sessions,starterCode} from '../../content/sessions';

it('S02 starter scaffold uses multiple declarations and a helper function supported by the runtime',()=>{
 const session=sessions.find(item=>item.id==='s02')!;
 const engine=new SimulationEngine(trackForSession('s02'));
 const runtime=new ProgramRuntime(engine);
 const diagnostics=runtime.run(starterCode(session));
 expect(diagnostics).toEqual([]);
});

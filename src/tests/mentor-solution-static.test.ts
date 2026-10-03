import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(p:string)=>readFileSync(p,'utf8');
// Structural guarantees of SEC-1 that a mocked-RPC test cannot show.
describe('mentor solution wiring (static)',()=>{
  it('the RPC is called only from the fetch helper, and the helper is used only by the panel on open',()=>{
    expect(read('src/features/code-editor/mentor-solution.ts')).toContain("rpc('mentor_get_solution'");
    const panel=read('src/features/code-editor/MentorSolutionPanel.tsx');
    expect(panel.match(/fetchMentorSolution\(/g)).toHaveLength(1);
    expect(panel).toMatch(/async function request\(\)[\s\S]*fetchMentorSolution\(/);
    expect(read('src/features/code-editor/CodeEditor.tsx')).not.toMatch(/fetchMentorSolution|mentor_get_solution/);
  });
  it('the panel only renders for mentorMode with a cohort and never persists anything',()=>{
    expect(read('src/features/code-editor/CodeEditor.tsx')).toContain('mentorMode&&cloudContext&&<MentorSolutionPanel');
    for(const file of ['MentorSolutionPanel.tsx','mentor-solution.ts']){
      expect(read(`src/features/code-editor/${file}`)).not.toMatch(/localStorage|sessionStorage|indexedDB|console\./);
    }
  });
});

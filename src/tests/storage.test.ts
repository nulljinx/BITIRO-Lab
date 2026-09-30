import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {sessions,starterCode} from '../content/sessions';
import {loadCode,saveCode,setStorageScope,codeKey,markExplored,explored,lastVisited,workspaceStorageScope} from '../features/code-editor/storage';
let data:Map<string,string>;
beforeEach(()=>{data=new Map();vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)});setStorageScope(null);});
afterEach(()=>vi.unstubAllGlobals());
it('keeps guest and different account documents separate',()=>{
 saveCode('s01','// guest');markExplored('s01');setStorageScope('person-a');
 expect(loadCode(sessions[0])).toBe(starterCode(sessions[0]));expect(explored()).toEqual([]);
 saveCode('s01','// person a');markExplored('s02');setStorageScope('person-b');
 expect(loadCode(sessions[0])).toBe(starterCode(sessions[0]));expect(lastVisited()).toBeNull();
 setStorageScope('person-a');expect(loadCode(sessions[0])).toBe('// person a');expect(lastVisited()).toBe('s02');
 setStorageScope(null);expect(loadCode(sessions[0])).toBe('// guest');expect(explored()).toEqual(['s01']);
});
it('keeps the same user session isolated between cohorts',()=>{
 const a=workspaceStorageScope('person-a','cohort-a'),b=workspaceStorageScope('person-a','cohort-b');
 saveCode('s01','// cohort a',a);markExplored('s01',a);
 expect(loadCode(sessions[0],b)).toBe(starterCode(sessions[0]));expect(explored(b)).toEqual([]);
 saveCode('s01','// cohort b',b);markExplored('s02',b);
 expect(loadCode(sessions[0],a)).toBe('// cohort a');expect(lastVisited(a)).toBe('s01');
 expect(loadCode(sessions[0],b)).toBe('// cohort b');expect(lastVisited(b)).toBe('s02');
});
it('migrates legacy code only to non-institutional namespaces',()=>{
 data.set('iroh-code-intermedio-s01',JSON.stringify({code:'// old work',lastOpenedAt:12}));
 setStorageScope('account');expect(loadCode(sessions[0])).toBe(starterCode(sessions[0]));
 setStorageScope(null);expect(loadCode(sessions[0])).toBe('// old work');expect(data.has(codeKey('s01'))).toBe(true);
 const institution=workspaceStorageScope('account','cohort-a');
 expect(loadCode(sessions[0],institution)).toBe(starterCode(sessions[0]));
});
it('refuses UTF-8 oversized programs without replacing the saved document',()=>{
 saveCode('s01','// keep');expect(saveCode('s01','é'.repeat(16385))).toBe(false);expect(loadCode(sessions[0])).toBe('// keep');
});
it('recovers safely from corrupt and unavailable local storage',()=>{
 data.set(codeKey('s01'),'{broken');expect(loadCode(sessions[0])).toBe(starterCode(sessions[0]));
 vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('full');}});
 expect(saveCode('s01','// test')).toBe(false);expect(explored()).toEqual([]);expect(lastVisited()).toBeNull();expect(loadCode(sessions[0])).toBe(starterCode(sessions[0]));
});

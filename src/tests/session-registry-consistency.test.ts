import {describe,expect,it} from 'vitest';
import {sessions,starterCode} from '../content/sessions';
import {hasSimulation,simulatedSessionIds,trackForSession} from '../content/tracks';
import {safeNext} from '../features/auth/auth-navigation';
import {workspaceMentorPath,workspacePath,workspaceSessionPath} from '../features/workspaces/workspace-paths';

const interactive=sessions.filter(session=>session.interactive);
const workspace={organization_id:'mustakis',cohort_id:'talca-2026'};

describe('sessions and track registry stay consistent',()=>{
 it('has unique ids that follow the sNN numbering',()=>{
  expect(new Set(sessions.map(s=>s.id)).size).toBe(sessions.length);
  for(const session of sessions)expect(session.id).toBe(`s${String(session.number).padStart(2,'0')}`);
 });
 it('every registered track belongs to an existing session',()=>{
  expect(simulatedSessionIds.length).toBeGreaterThan(0);
  for(const id of simulatedSessionIds)expect(sessions.some(s=>s.id===id),id).toBe(true);
 });
 it('interactive and hasSimulation are never in an impossible combination',()=>{
  for(const session of sessions)expect(hasSimulation(session.id),session.id).toBe(session.interactive);
  expect([...simulatedSessionIds].sort()).toEqual(interactive.map(s=>s.id).sort());
 });
 it('each interactive session resolves a track with its own id and a track asset',()=>{
  expect(interactive.length).toBeGreaterThan(0);
  for(const session of interactive){
   expect(trackForSession(session.id).id).toBe(session.id);
   expect(session.trackAsset,session.id).toBe(`/tracks/${session.id}.png`);
   expect(session.objectives.length,session.id).toBeGreaterThan(0);
  }
 });
 it('keeps S01-S05 interactive',()=>{
  for(const id of ['s01','s02','s03','s04','s05']){
   expect(sessions.find(s=>s.id===id)?.interactive,id).toBe(true);
   expect(hasSimulation(id),id).toBe(true);
  }
 });
 it('keeps non-interactive sessions as placeholders without track, asset or objectives',()=>{
  for(const session of sessions.filter(s=>!s.interactive)){
   expect(session.trackAsset,session.id).toBeUndefined();
   expect(session.objectives,session.id).toEqual([]);
   expect(()=>trackForSession(session.id)).toThrow(/No hay pista interactiva/);
  }
 });
 it('rejects ids that are not own keys of the registry',()=>{
  for(const id of ['','s99','constructor','__proto__','toString'])expect(hasSimulation(id),id).toBe(false);
  expect(()=>trackForSession('s99')).toThrow('No hay pista interactiva para s99.');
 });
 it('gives each interactive session its own starter code',()=>{
  const starters=interactive.map(session=>starterCode(session));
  expect(new Set(starters).size).toBe(starters.length);
  for(const [index,starter] of starters.entries())expect(starter,interactive[index].id).toContain(`Sesión ${String(interactive[index].number).padStart(2,'0')}`);
 });
});

describe('institutional routes cover every session',()=>{
 it('safeNext accepts the paths built by the workspace path helpers for every session',()=>{
  expect(safeNext(workspacePath(workspace))).toBe(workspacePath(workspace));
  expect(safeNext(workspaceMentorPath(workspace))).toBe(workspaceMentorPath(workspace));
  for(const session of sessions){
   const path=workspaceSessionPath(workspace,session.id);
   expect(safeNext(path),session.id).toBe(path);
   expect(safeNext(`${path}?debug=1`),session.id).toBe(`${path}?debug=1`);
   expect(safeNext(`/intermedio/${session.id}`),session.id).toBe(`/intermedio/${session.id}`);
  }
 });
 it('safeNext falls back for sessions that do not exist',()=>{
  expect(safeNext(workspaceSessionPath(workspace,'s09'))).toBe('/espacios');
  expect(safeNext(workspaceSessionPath(workspace,'s00'))).toBe('/espacios');
  expect(safeNext('/intermedio/s09')).toBe('/espacios');
  expect(safeNext(null)).toBe('/espacios');
  expect(safeNext('/x','/cuenta')).toBe('/cuenta');
 });
});

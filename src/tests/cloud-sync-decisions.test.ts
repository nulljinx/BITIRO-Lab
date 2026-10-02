import {describe,expect,it} from 'vitest';
import {afterSuccessfulSave,decideInitialSync,decideRejectedSave,remoteRevision,revisionAfterKeepingLocal} from '../features/code-editor/cloud-sync-decisions';
import type {CloudDocument} from '../features/code-editor/cloud-learning';

const doc=(source:string,revision=5):CloudDocument=>({source,revision,updated_at:'t'});
const base={currentCode:'local',hasLocalDraft:false,typed:false};

describe('initial cloud sync decision',()=>{
 it('restores the remote document when there is no authored local draft',()=>{
  expect(decideInitialSync({...base,remote:doc('remote')})).toBe('restore-remote');
 });
 it('reports a conflict when the remote differs and a local draft exists',()=>{
  expect(decideInitialSync({...base,remote:doc('remote'),hasLocalDraft:true})).toBe('conflict');
 });
 it('reports a conflict when the remote differs and the student already typed this session',()=>{
  expect(decideInitialSync({...base,remote:doc('remote'),typed:true})).toBe('conflict');
 });
 it('never restores over a local draft, even when both flags are set',()=>{
  expect(decideInitialSync({...base,remote:doc('remote'),hasLocalDraft:true,typed:true})).toBe('conflict');
 });
 it.each([[false,false],[true,false],[false,true]])('creates no false conflict and uploads nothing when local equals remote (draft=%s typed=%s)',(hasLocalDraft,typed)=>{
  expect(decideInitialSync({remote:doc('local'),currentCode:'local',hasLocalDraft,typed})).toBe('synced');
 });
 it('queues the local code when the cloud has no document and local work exists',()=>{
  expect(decideInitialSync({...base,remote:null,hasLocalDraft:true})).toBe('synced-and-queue-local');
  expect(decideInitialSync({...base,remote:null,typed:true})).toBe('synced-and-queue-local');
 });
 it('only marks synced when neither side has a document or local work',()=>{
  expect(decideInitialSync({...base,remote:null})).toBe('synced');
 });
});

describe('rejected save (ok:false) decision',()=>{
 it('flags a conflict when the latest remote differs from the current code',()=>{
  expect(decideRejectedSave(doc('remote'),'local')).toBe('conflict');
 });
 it('marks saved (no conflict) when the latest remote equals the current code',()=>{
  expect(decideRejectedSave(doc('local'),'local')).toBe('saved');
 });
 it('marks saved when the remote document no longer exists',()=>{
  expect(decideRejectedSave(null,'local')).toBe('saved');
 });
});

describe('revision bookkeeping',()=>{
 it('adopts the remote revision, or 0 when there is no document',()=>{
  expect(remoteRevision(doc('x',9))).toBe(9);
  expect(remoteRevision(doc('x',0))).toBe(0);
  expect(remoteRevision(null)).toBe(0);
  expect(remoteRevision(undefined)).toBe(0);
 });
 it('after a successful upload prepares the server revision for the next save',()=>{
  expect(afterSuccessfulSave({resultRevision:8,sentRevision:7,hasQueuedUpload:false})).toEqual({revision:8,state:'saved'});
 });
 it('falls back to sent revision + 1 when the server returns no revision',()=>{
  expect(afterSuccessfulSave({resultRevision:undefined,sentRevision:7,hasQueuedUpload:false}).revision).toBe(8);
  expect(afterSuccessfulSave({resultRevision:0,sentRevision:7,hasQueuedUpload:false}).revision).toBe(0);
 });
 it('stays pending when newer code was queued during the upload',()=>{
  expect(afterSuccessfulSave({resultRevision:8,sentRevision:7,hasQueuedUpload:true})).toEqual({revision:8,state:'pending'});
 });
 it('keeping local adopts the conflicting remote revision so the re-queued upload can win',()=>{
  expect(revisionAfterKeepingLocal(doc('remote',12),3)).toBe(12);
 });
 it('keeping local without a conflict document leaves the revision untouched',()=>{
  expect(revisionAfterKeepingLocal(null,3)).toBe(3);
  expect(revisionAfterKeepingLocal(null,null)).toBeNull();
 });
});

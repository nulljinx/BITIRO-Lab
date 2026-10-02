import type {CloudDocument} from './cloud-learning';

// Pure decisions extracted verbatim from CodeEditor so they can be characterised. No React, Supabase or effects.

export const remoteRevision=(document:CloudDocument|null|undefined):number=>document?.revision??0;

export type InitialSyncDecision='restore-remote'|'conflict'|'synced'|'synced-and-queue-local';
export function decideInitialSync(input:{remote:CloudDocument|null;currentCode:string;hasLocalDraft:boolean;typed:boolean}):InitialSyncDecision{
 const {remote,currentCode,hasLocalDraft,typed}=input;
 if(remote && remote.source!==currentCode){
  if(!hasLocalDraft&&!typed)return 'restore-remote';
  return 'conflict';
 }
 if(!remote && (hasLocalDraft||typed))return 'synced-and-queue-local';
 return 'synced';
}

export function decideRejectedSave(latest:CloudDocument|null,currentCode:string):'conflict'|'saved'{
 return latest && latest.source!==currentCode?'conflict':'saved';
}

export function afterSuccessfulSave(input:{resultRevision:number|undefined;sentRevision:number;hasQueuedUpload:boolean}):{revision:number;state:'saved'|'pending'}{
 return {revision:input.resultRevision??input.sentRevision+1,state:input.hasQueuedUpload?'pending':'saved'};
}

export function revisionAfterKeepingLocal(conflict:CloudDocument|null,current:number|null):number|null{
 return conflict?.revision??current;
}

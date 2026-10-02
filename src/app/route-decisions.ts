import type {AuthStatus} from '../features/auth/auth-types';

// Pure decisions extracted verbatim from the route guards in App.tsx so they can be characterised.
// Components still own rendering and navigation; nothing here touches React, Supabase or the router.

export type GuardDecision=
 |{kind:'loading'}
 |{kind:'render'}
 |{kind:'redirect';to:string};

export function decideAccountGate(input:{status:AuthStatus;next:string;registerFirst:boolean}):GuardDecision{
 if(input.status==='loading')return {kind:'loading'};
 if(input.status==='authenticated')return {kind:'render'};
 const target=input.registerFirst?'/registro':'/login';
 return {kind:'redirect',to:`${target}?next=${encodeURIComponent(input.next)}`};
}

export function decideStaffGate(input:{status:AuthStatus;role:string|null}):GuardDecision|{kind:'forbidden'}{
 if(input.status!=='authenticated')return {kind:'redirect',to:'/login?next=/equipo'};
 if(!input.role||input.role==='participant')return {kind:'forbidden'};
 return {kind:'render'};
}

export function decideLegacySession(input:{sessionExists:boolean;status:AuthStatus}):GuardDecision{
 if(!input.sessionExists)return {kind:'redirect',to:'/'};
 if(input.status==='unconfigured')return {kind:'render'};
 return {kind:'redirect',to:input.status==='authenticated'?'/espacios':'/login?next=/espacios'};
}

export function decideLegacyResources(input:{status:AuthStatus}):GuardDecision{
 if(input.status==='unconfigured')return {kind:'render'};
 return {kind:'redirect',to:input.status==='authenticated'?'/espacios':'/login?next=/espacios'};
}

export type SpacesEntryDecision=GuardDecision|{kind:'redirect-sole-workspace'};
export function decideSpacesEntry(input:{status:AuthStatus;workspacesLoading:boolean;workspaceCount:number}):SpacesEntryDecision{
 if(input.status==='loading'||input.workspacesLoading)return {kind:'loading'};
 if(input.status!=='authenticated')return {kind:'redirect',to:'/login?next=/espacios'};
 if(input.workspaceCount===1)return {kind:'redirect-sole-workspace'};
 return {kind:'render'};
}

export type WorkspaceDecision=GuardDecision|{kind:'redirect-workspace'};
export function decideWorkspaceRoute(input:{status:AuthStatus;workspacesLoading:boolean;requested:string;workspaceFound:boolean}):GuardDecision{
 if(input.status==='loading'||input.workspacesLoading)return {kind:'loading'};
 if(input.status!=='authenticated')return {kind:'redirect',to:`/login?next=${encodeURIComponent(input.requested)}`};
 if(!input.workspaceFound)return {kind:'redirect',to:'/espacios'};
 return {kind:'render'};
}

export function decideMentorRoute(input:{status:AuthStatus;workspacesLoading:boolean;requested:string;workspaceFound:boolean;canManage:boolean}):WorkspaceDecision{
 const base=decideWorkspaceRoute(input);
 if(base.kind!=='render')return base;
 if(!input.canManage)return {kind:'redirect-workspace'};
 return {kind:'render'};
}

export type SessionAccess='idle'|'loading'|'allowed'|'locked'|'error';
export function sessionAccessFor(row:{released:boolean;can_manage:boolean}|undefined):'allowed'|'locked'{
 return row&&(row.released||row.can_manage)?'allowed':'locked';
}
export type InstitutionSessionDecision=GuardDecision|{kind:'locked'}|{kind:'access-error'};
export function decideInstitutionSession(input:{status:AuthStatus;workspacesLoading:boolean;requested:string;workspaceFound:boolean;sessionFound:boolean;access:SessionAccess}):InstitutionSessionDecision{
 if(input.status==='loading'||input.workspacesLoading)return {kind:'loading'};
 if(input.status!=='authenticated')return {kind:'redirect',to:`/login?next=${encodeURIComponent(input.requested)}`};
 if(!input.workspaceFound||!input.sessionFound)return {kind:'redirect',to:'/espacios'};
 if(input.access==='idle'||input.access==='loading')return {kind:'loading'};
 if(input.access==='locked')return {kind:'locked'};
 if(input.access==='error')return {kind:'access-error'};
 return {kind:'render'};
}

export type LegacyWorkspaceDecision=GuardDecision|{kind:'redirect-workspace';target:'workspace'|'mentor'|'session'};
export function decideLegacyWorkspaceRedirect(input:{status:AuthStatus;workspacesLoading:boolean;kind:'workspace'|'mentor'|'session';organizationMatches:number;canManage:boolean;hasSessionId:boolean}):LegacyWorkspaceDecision{
 if(input.status==='loading'||input.workspacesLoading)return {kind:'loading'};
 if(input.status!=='authenticated')return {kind:'redirect',to:'/login?next=/espacios'};
 if(input.organizationMatches!==1)return {kind:'redirect',to:'/espacios'};
 if(input.kind==='mentor')return {kind:'redirect-workspace',target:input.canManage?'mentor':'workspace'};
 if(input.kind==='session'&&input.hasSessionId)return {kind:'redirect-workspace',target:'session'};
 return {kind:'redirect-workspace',target:'workspace'};
}

import {describe,expect,it} from 'vitest';
import type {AuthStatus} from '../features/auth/auth-types';
import {decideAccountGate,decideInstitutionSession,decideLegacyResources,decideLegacySession,decideLegacyWorkspaceRedirect,decideMentorRoute,decideSpacesEntry,decideStaffGate,decideWorkspaceRoute,sessionAccessFor} from '../app/route-decisions';

const requested='/espacios/mustakis/grupos/talca-a/intermedio/s02';
const loginNext=`/login?next=${encodeURIComponent(requested)}`;
const redirect=(to:string)=>({kind:'redirect',to});
const unauthenticated:AuthStatus[]=['anonymous','unconfigured'];

describe('AccountGate',()=>{
 it('waits while auth loads, renders when authenticated',()=>{
  expect(decideAccountGate({status:'loading',next:'/cuenta',registerFirst:false})).toEqual({kind:'loading'});
  expect(decideAccountGate({status:'authenticated',next:'/cuenta',registerFirst:false})).toEqual({kind:'render'});
 });
 it.each(unauthenticated)('sends %s visitors to login or register with an encoded next',status=>{
  expect(decideAccountGate({status,next:'/cuenta',registerFirst:false})).toEqual(redirect('/login?next=%2Fcuenta'));
  expect(decideAccountGate({status,next:'/espacios',registerFirst:true})).toEqual(redirect('/registro?next=%2Fespacios'));
 });
});

describe('StaffGate',()=>{
 it('redirects anyone not authenticated to login for /equipo',()=>{
  for(const status of (['loading',...unauthenticated] as AuthStatus[]))expect(decideStaffGate({status,role:'admin'})).toEqual(redirect('/login?next=/equipo'));
 });
 it('forbids authenticated users without membership or with participant role',()=>{
  expect(decideStaffGate({status:'authenticated',role:null})).toEqual({kind:'forbidden'});
  expect(decideStaffGate({status:'authenticated',role:'participant'})).toEqual({kind:'forbidden'});
 });
 it('renders for any other role',()=>{
  for(const role of ['facilitator','admin','coordinator'])expect(decideStaffGate({status:'authenticated',role})).toEqual({kind:'render'});
 });
});

describe('legacy public routes (only open when Supabase is not configured)',()=>{
 it('LegacySessionRoute: unknown session goes home before any auth check',()=>{
  for(const status of ['loading','authenticated','unconfigured','anonymous'] as AuthStatus[])expect(decideLegacySession({sessionExists:false,status})).toEqual(redirect('/'));
 });
 it('LegacySessionRoute: renders the free simulator only when unconfigured',()=>{
  expect(decideLegacySession({sessionExists:true,status:'unconfigured'})).toEqual({kind:'render'});
  expect(decideLegacySession({sessionExists:true,status:'authenticated'})).toEqual(redirect('/espacios'));
  expect(decideLegacySession({sessionExists:true,status:'anonymous'})).toEqual(redirect('/login?next=/espacios'));
  expect(decideLegacySession({sessionExists:true,status:'loading'})).toEqual(redirect('/login?next=/espacios'));
 });
 it('LegacyResourcesGate follows the same rule',()=>{
  expect(decideLegacyResources({status:'unconfigured'})).toEqual({kind:'render'});
  expect(decideLegacyResources({status:'authenticated'})).toEqual(redirect('/espacios'));
  expect(decideLegacyResources({status:'anonymous'})).toEqual(redirect('/login?next=/espacios'));
 });
});

describe('SpacesEntryRoute',()=>{
 it('loads while auth or workspaces load',()=>{
  expect(decideSpacesEntry({status:'loading',workspacesLoading:false,workspaceCount:3})).toEqual({kind:'loading'});
  expect(decideSpacesEntry({status:'authenticated',workspacesLoading:true,workspaceCount:3})).toEqual({kind:'loading'});
 });
 it('sends guests to login',()=>{
  expect(decideSpacesEntry({status:'anonymous',workspacesLoading:false,workspaceCount:1})).toEqual(redirect('/login?next=/espacios'));
 });
 it('enters directly only when there is exactly one workspace, otherwise shows the list',()=>{
  expect(decideSpacesEntry({status:'authenticated',workspacesLoading:false,workspaceCount:1})).toEqual({kind:'redirect-sole-workspace'});
  expect(decideSpacesEntry({status:'authenticated',workspacesLoading:false,workspaceCount:0})).toEqual({kind:'render'});
  expect(decideSpacesEntry({status:'authenticated',workspacesLoading:false,workspaceCount:2})).toEqual({kind:'render'});
 });
});

describe('WorkspaceRoute and MentorRoute',()=>{
 const ws={status:'authenticated' as AuthStatus,workspacesLoading:false,requested:'/espacios/mustakis/grupos/talca-a',workspaceFound:true};
 it('wait while loading',()=>{
  expect(decideWorkspaceRoute({...ws,status:'loading'})).toEqual({kind:'loading'});
  expect(decideWorkspaceRoute({...ws,workspacesLoading:true})).toEqual({kind:'loading'});
 });
 it('send guests to login preserving the requested path',()=>{
  expect(decideWorkspaceRoute({...ws,status:'anonymous'})).toEqual(redirect('/login?next=%2Fespacios%2Fmustakis%2Fgrupos%2Ftalca-a'));
 });
 it('send members of no such cohort back to /espacios',()=>{
  expect(decideWorkspaceRoute({...ws,workspaceFound:false})).toEqual(redirect('/espacios'));
  expect(decideMentorRoute({...ws,workspaceFound:false,canManage:true})).toEqual(redirect('/espacios'));
 });
 it('render the workspace for a member',()=>{
  expect(decideWorkspaceRoute(ws)).toEqual({kind:'render'});
 });
 it('mentor route: guests and loading behave like the workspace route',()=>{
  expect(decideMentorRoute({...ws,status:'loading',canManage:true})).toEqual({kind:'loading'});
  expect(decideMentorRoute({...ws,status:'anonymous',requested:'/m',canManage:true})).toEqual(redirect('/login?next=%2Fm'));
 });
 it('mentor route: participants are sent to their workspace, managers get the page',()=>{
  expect(decideMentorRoute({...ws,canManage:false})).toEqual({kind:'redirect-workspace'});
  expect(decideMentorRoute({...ws,canManage:true})).toEqual({kind:'render'});
 });
});

describe('InstitutionSessionRoute',()=>{
 const base={status:'authenticated' as AuthStatus,workspacesLoading:false,requested,workspaceFound:true,sessionFound:true,access:'allowed' as const};
 it('waits while auth or workspaces load',()=>{
  expect(decideInstitutionSession({...base,status:'loading'})).toEqual({kind:'loading'});
  expect(decideInstitutionSession({...base,workspacesLoading:true})).toEqual({kind:'loading'});
 });
 it('sends guests to login before looking at anything else',()=>{
  expect(decideInstitutionSession({...base,status:'anonymous',workspaceFound:false,sessionFound:false})).toEqual(redirect(loginNext));
 });
 it('redirects to /espacios when the cohort or the session does not exist',()=>{
  expect(decideInstitutionSession({...base,workspaceFound:false})).toEqual(redirect('/espacios'));
  expect(decideInstitutionSession({...base,sessionFound:false})).toEqual(redirect('/espacios'));
 });
 it('never renders the session until access is confirmed',()=>{
  expect(decideInstitutionSession({...base,access:'idle'})).toEqual({kind:'loading'});
  expect(decideInstitutionSession({...base,access:'loading'})).toEqual({kind:'loading'});
  expect(decideInstitutionSession({...base,access:'locked'})).toEqual({kind:'locked'});
  expect(decideInstitutionSession({...base,access:'error'})).toEqual({kind:'access-error'});
  expect(decideInstitutionSession(base)).toEqual({kind:'render'});
 });
 it('grants access only to released sessions or managers',()=>{
  expect(sessionAccessFor({released:true,can_manage:false})).toBe('allowed');
  expect(sessionAccessFor({released:false,can_manage:true})).toBe('allowed');
  expect(sessionAccessFor({released:false,can_manage:false})).toBe('locked');
  expect(sessionAccessFor(undefined)).toBe('locked');
 });
});

describe('LegacyWorkspaceRedirect',()=>{
 const base={status:'authenticated' as AuthStatus,workspacesLoading:false,kind:'workspace' as const,organizationMatches:1,canManage:false,hasSessionId:true};
 it('waits while loading and sends guests to /login?next=/espacios',()=>{
  expect(decideLegacyWorkspaceRedirect({...base,status:'loading'})).toEqual({kind:'loading'});
  expect(decideLegacyWorkspaceRedirect({...base,workspacesLoading:true})).toEqual({kind:'loading'});
  expect(decideLegacyWorkspaceRedirect({...base,status:'anonymous'})).toEqual(redirect('/login?next=/espacios'));
 });
 it('only resolves when exactly one cohort matches the organization',()=>{
  expect(decideLegacyWorkspaceRedirect({...base,organizationMatches:0})).toEqual(redirect('/espacios'));
  expect(decideLegacyWorkspaceRedirect({...base,organizationMatches:2})).toEqual(redirect('/espacios'));
 });
 it('mentor links reach the mentor page only for managers',()=>{
  expect(decideLegacyWorkspaceRedirect({...base,kind:'mentor',canManage:true})).toEqual({kind:'redirect-workspace',target:'mentor'});
  expect(decideLegacyWorkspaceRedirect({...base,kind:'mentor',canManage:false})).toEqual({kind:'redirect-workspace',target:'workspace'});
 });
 it('session links keep the session, but fall back to the workspace without an id',()=>{
  expect(decideLegacyWorkspaceRedirect({...base,kind:'session'})).toEqual({kind:'redirect-workspace',target:'session'});
  expect(decideLegacyWorkspaceRedirect({...base,kind:'session',hasSessionId:false})).toEqual({kind:'redirect-workspace',target:'workspace'});
  expect(decideLegacyWorkspaceRedirect(base)).toEqual({kind:'redirect-workspace',target:'workspace'});
 });
});

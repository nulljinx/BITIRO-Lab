import {lazy,Suspense,useEffect,useLayoutEffect,useState,type ReactNode} from 'react';
import {Routes,Route,useParams,Navigate,useLocation,Link} from 'react-router-dom';
import {Guide} from '../features/guide/Guide';
import {sessions,type SessionDefinition} from '../content/sessions';
import {Topbar} from './Topbar';
import {AuthProvider,useAuth} from '../features/auth/AuthProvider';
import {setStorageScope,workspaceStorageScope} from '../features/code-editor/storage';
import {ErrorBoundary} from '../components/ErrorBoundary';
import {WorkspaceProvider,useWorkspaces} from '../features/workspaces/WorkspaceProvider';
import {LandingPage,LockedInstitutionSession,MentorWorkspacePage,OrganizationWorkspacePage,SpacesPage} from '../features/workspaces/WorkspacePages';
import {workspaceMentorPath,workspacePath,workspaceSessionPath} from '../features/workspaces/workspace-paths';
import type {WorkspaceSummary} from '../features/workspaces/workspace-types';
import {decideAccountGate,decideInstitutionSession,decideLegacyResources,decideLegacySession,decideLegacyWorkspaceRedirect,decideMentorRoute,decideSpacesEntry,decideStaffGate,decideWorkspaceRoute,sessionAccessFor} from './route-decisions';
const Simulator=lazy(()=>import('../features/simulator/Simulator').then(m=>({default:m.Simulator})));
const AuthPage=lazy(()=>import('../features/auth/AuthPages').then(m=>({default:m.AuthPage})));
const AccountPage=lazy(()=>import('../features/account/AccountPage').then(m=>({default:m.AccountPage})));
const AdminPage=lazy(()=>import('../features/admin/AdminPage').then(m=>({default:m.AdminPage})));
const ResourcesPage=lazy(()=>import('../features/platform/ContentPages').then(m=>({default:m.ResourcesPage})));
const SitesPage=lazy(()=>import('../features/platform/ContentPages').then(m=>({default:m.SitesPage})));
const PrivacyPage=lazy(()=>import('../features/platform/ContentPages').then(m=>({default:m.PrivacyPage})));

export function LoadingView(){return <main id="main" className="brand-loading" aria-live="polite"><img src="/brand/bitiro-symbol-128.png" alt=""/><h1>Preparando tu laboratorio.</h1><p>Un momento. Estamos cargando las herramientas y contenidos de Robótica Educativa.</p><div className="loading-track" aria-hidden="true"/></main>;}
function StorageScope({children}:{children:ReactNode}){
  const {status,user}=useAuth();const wanted=user?.id??'guest';const [ready,setReady]=useState<string|null>(null);
  useLayoutEffect(()=>{setStorageScope(wanted);setReady(wanted);},[wanted]);
  if(status==='loading'||ready!==wanted)return <LoadingView/>;
  return <div key={wanted} className="application">{children}</div>;
}
type Page='landing'|'spaces'|'resources'|'sites'|'privacy'|'account'|'admin';
function AppShell({session,page,workspace,children}:{session?:SessionDefinition;page?:Page;workspace?:WorkspaceSummary;children?:ReactNode}){
  const [guide,setGuide]=useState<SessionDefinition|null>(null);const {user}=useAuth();
  const institutionalScope=workspace&&user?workspaceStorageScope(user.id,workspace.cohort_id):undefined;
  const cloudContext=workspace&&user?{userId:user.id,cohortId:workspace.cohort_id,activityVersion:1}:undefined;
  let content:ReactNode=children;
  if(!content)content=session?<Simulator key={`${user?.id??'guest'}-${workspace?.cohort_id??'free'}-${session.id}`} session={session} storageScope={institutionalScope} cloudContext={cloudContext} mentorMode={!!workspace?.can_manage}/>:page==='landing'?<LandingPage/>:page==='spaces'?<SpacesPage/>:page==='resources'?<ResourcesPage onGuide={()=>setGuide(sessions[0])}/>:page==='sites'?<SitesPage/>:page==='privacy'?<PrivacyPage/>:page==='account'?<AccountPage/>:page==='admin'?<StaffGate><AdminPage/></StaffGate>:null;
  const institutionTheme=workspace?.organization_id==='mustakis'?'institution-shell theme-mustakis':'';
  return <><a className="skip-link" href="#main">Ir al contenido</a><Topbar session={session} workspace={workspace} onGuide={()=>setGuide(session??sessions[0])}/><ErrorBoundary><Suspense fallback={<LoadingView/>}>{institutionTheme?<div className={institutionTheme}>{content}</div>:content}</Suspense></ErrorBoundary>{guide&&<Guide session={guide} onClose={()=>setGuide(null)}/>}</>;
}
function AccountGate({children,next='/espacios',registerFirst=false}:{children:ReactNode;next?:string;registerFirst?:boolean}){
  const {status}=useAuth();
  const decision=decideAccountGate({status,next,registerFirst});
  if(decision.kind==='loading')return <LoadingView/>;
  if(decision.kind==='render')return children;
  return <Navigate to={decision.to} replace/>;
}
function StaffGate({children}:{children:ReactNode}){
  const {status,membership}=useAuth();
  const decision=decideStaffGate({status,role:membership?membership.role:null});
  if(decision.kind==='redirect')return <Navigate to={decision.to} replace/>;
  if(decision.kind==='forbidden')return <main id="main" className="recovery-page"><span className="eyebrow">Área de plataforma</span><h1>Esta sección requiere permisos.</h1><p>El acceso de equipo se administra por separado de los permisos de participante y mentor del programa.</p><Link className="button" to="/espacios">Volver a mi programa</Link></main>;
  return children;
}
function LegacySessionRoute(){
  const {sessionId}=useParams();const {status}=useAuth();const session=sessions.find(s=>s.id===sessionId);
  const decision=decideLegacySession({sessionExists:!!session,status});
  if(decision.kind==='render')return <AppShell session={session}/>;
  return <Navigate to={(decision as {to:string}).to} replace/>;
}
function LegacyResourcesGate(){const {status}=useAuth();const decision=decideLegacyResources({status});if(decision.kind==='render')return <AppShell page="resources"/>;return <Navigate to={(decision as {to:string}).to} replace/>;}

function findWorkspace(workspaces:WorkspaceSummary[],orgId:string|undefined,cohortId:string|undefined){return workspaces.find(item=>item.organization_id===orgId&&item.cohort_id===cohortId);}

function SpacesEntryRoute(){
  const {status}=useAuth();
  const state=useWorkspaces();
  const decision=decideSpacesEntry({status,workspacesLoading:state.loading,workspaceCount:state.workspaces.length});
  if(decision.kind==='loading')return <LoadingView/>;
  if(decision.kind==='redirect')return <Navigate to={decision.to} replace/>;
  if(decision.kind==='redirect-sole-workspace')return <Navigate to={workspacePath(state.workspaces[0])} replace/>;
  return <AppShell page="spaces"/>;
}
function WorkspaceRoute(){
  const {orgId,cohortId}=useParams();const {status}=useAuth();const state=useWorkspaces();
  const requested=`/espacios/${orgId??''}/grupos/${cohortId??''}`;
  const workspace=findWorkspace(state.workspaces,orgId,cohortId);
  const decision=decideWorkspaceRoute({status,workspacesLoading:state.loading,requested,workspaceFound:!!workspace});
  if(decision.kind==='loading')return <LoadingView/>;
  if(decision.kind==='redirect')return <Navigate to={decision.to} replace/>;
  return <AppShell workspace={workspace!}><OrganizationWorkspacePage workspace={workspace!}/></AppShell>;
}
function MentorRoute(){
  const {orgId,cohortId}=useParams();const {status}=useAuth();const state=useWorkspaces();
  const requested=`/espacios/${orgId??''}/grupos/${cohortId??''}/mentor`;
  const workspace=findWorkspace(state.workspaces,orgId,cohortId);
  const decision=decideMentorRoute({status,workspacesLoading:state.loading,requested,workspaceFound:!!workspace,canManage:!!workspace?.can_manage});
  if(decision.kind==='loading')return <LoadingView/>;
  if(decision.kind==='redirect')return <Navigate to={decision.to} replace/>;
  if(decision.kind==='redirect-workspace')return <Navigate to={workspacePath(workspace!)} replace/>;
  return <AppShell workspace={workspace!}><MentorWorkspacePage workspace={workspace!}/></AppShell>;
}
function InstitutionSessionRoute(){
  const {orgId,cohortId,sessionId}=useParams();const {status}=useAuth();const state=useWorkspaces();const [access,setAccess]=useState<'idle'|'loading'|'allowed'|'locked'|'error'>('idle');
  const workspace=findWorkspace(state.workspaces,orgId,cohortId),session=sessions.find(item=>item.id===sessionId);
  useEffect(()=>{
    let active=true;
    if(status!=='authenticated'||!workspace){setAccess('idle');return()=>{active=false;};}
    setAccess('loading');
    state.loadSessionAccess(workspace).then(items=>{if(!active)return;const row=items.find(item=>item.session_id===sessionId);setAccess(sessionAccessFor(row));}).catch(()=>{if(active)setAccess('error');});
    return()=>{active=false;};
  },[status,workspace?.cohort_id,sessionId]);
  const requested=`/espacios/${orgId??''}/grupos/${cohortId??''}/intermedio/${sessionId??''}`;
  const decision=decideInstitutionSession({status,workspacesLoading:state.loading,requested,workspaceFound:!!workspace,sessionFound:!!session,access});
  if(decision.kind==='loading')return <LoadingView/>;
  if(decision.kind==='redirect')return <Navigate to={decision.to} replace/>;
  if(decision.kind==='locked')return <AppShell workspace={workspace!}><LockedInstitutionSession workspace={workspace!} sessionId={session!.id}/></AppShell>;
  if(decision.kind==='access-error')return <AppShell workspace={workspace!}><main id="main" className="recovery-page"><h1>No pudimos comprobar el acceso.</h1><p>Reintenta desde tu programa. No mostramos una sesión hasta confirmar que está habilitada para tu grupo.</p><Link className="button" to={workspacePath(workspace!)}>Volver a mi espacio</Link></main></AppShell>;
  return <AppShell workspace={workspace!} session={session!}/>;
}
function LegacyWorkspaceRedirect({kind='workspace'}:{kind?:'workspace'|'mentor'|'session'}){
  const {orgId,sessionId}=useParams();const {status}=useAuth();const state=useWorkspaces();
  const matches=state.workspaces.filter(item=>item.organization_id===orgId);
  const decision=decideLegacyWorkspaceRedirect({status,workspacesLoading:state.loading,kind,organizationMatches:matches.length,canManage:!!matches[0]?.can_manage,hasSessionId:!!sessionId});
  if(decision.kind==='loading')return <LoadingView/>;
  if(decision.kind==='redirect')return <Navigate to={decision.to} replace/>;
  const workspace=matches[0];
  if(decision.kind==='redirect-workspace'&&decision.target==='mentor')return <Navigate to={workspaceMentorPath(workspace)} replace/>;
  if(decision.kind==='redirect-workspace'&&decision.target==='session')return <Navigate to={workspaceSessionPath(workspace,sessionId!)} replace/>;
  return <Navigate to={workspacePath(workspace)} replace/>;
}
function RouteReset(){const {pathname}=useLocation();useLayoutEffect(()=>{window.scrollTo(0,0);},[pathname]);return null;}
function AppRoutes(){return <><RouteReset/><Routes>
  <Route path="/" element={<AppShell page="landing"/>}/>
  <Route path="/espacios" element={<SpacesEntryRoute/>}/>
  <Route path="/espacios/:orgId/grupos/:cohortId" element={<WorkspaceRoute/>}/>
  <Route path="/espacios/:orgId/grupos/:cohortId/mentor" element={<MentorRoute/>}/>
  <Route path="/espacios/:orgId/grupos/:cohortId/intermedio/:sessionId" element={<InstitutionSessionRoute/>}/>
  <Route path="/espacios/:orgId" element={<LegacyWorkspaceRedirect/>}/>
  <Route path="/espacios/:orgId/mentor" element={<LegacyWorkspaceRedirect kind="mentor"/>}/>
  <Route path="/espacios/:orgId/intermedio/:sessionId" element={<LegacyWorkspaceRedirect kind="session"/>}/>
  <Route path="/intermedio/:sessionId" element={<LegacySessionRoute/>}/>
  <Route path="/recursos" element={<LegacyResourcesGate/>}/><Route path="/comunidad" element={<AppShell page="sites"/>}/><Route path="/privacidad" element={<AppShell page="privacy"/>}/><Route path="/cuenta" element={<AccountGate next="/cuenta"><AppShell page="account"/></AccountGate>}/><Route path="/equipo" element={<AppShell page="admin"/>}/>
  {(['login','registro','recuperar','actualizar-clave','auth/callback'] as const).map((path,index)=><Route key={path} path={`/${path}`} element={<ErrorBoundary><Suspense fallback={<LoadingView/>}><AuthPage mode={(['login','register','reset','update','callback'] as const)[index]}/></Suspense></ErrorBoundary>}/>) }
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></>;}
export function App(){return <AuthProvider><StorageScope><WorkspaceProvider><AppRoutes/></WorkspaceProvider></StorageScope></AuthProvider>;}

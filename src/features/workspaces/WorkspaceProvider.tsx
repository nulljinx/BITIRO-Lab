import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {useAuth} from '../auth/AuthProvider';
import * as service from './workspace-service';
import type {CohortLearningRow,MentorWorkspaceOverview,ParticipantInvite,WorkspaceContextValue,WorkspaceParticipant,WorkspaceSessionAccess,WorkspaceSummary} from './workspace-types';

const Context=createContext<WorkspaceContextValue|null>(null);
export function WorkspaceProvider({children}:{children:ReactNode}){
  const auth=useAuth();
  const [workspaces,setWorkspaces]=useState<WorkspaceSummary[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[loadedUserId,setLoadedUserId]=useState<string|null>(null);
  const refresh=useCallback(async()=>{
    if(auth.status==='loading')return;
    if(auth.status!=='authenticated'){setWorkspaces([]);setLoadedUserId(null);setLoading(false);setError(null);return;}
    const userId=auth.user?.id??null;
    setLoading(true);setError(null);
    try{setWorkspaces(await service.listMyWorkspaces());}
    catch(e){setError(e instanceof Error?e.message:'No pudimos cargar tus espacios.');}
    finally{setLoadedUserId(userId);setLoading(false);}
  },[auth.status,auth.user?.id]);
  useEffect(()=>{void refresh();},[refresh]);
  const redeemCode=useCallback(async(code:string)=>{if(auth.status!=='authenticated')throw new Error('Primero debes ingresar a tu cuenta BITIRO.');const item=await service.redeemWorkspaceCode(code);await refresh();return item;},[auth.status,refresh]);
  const loadSessionAccess=useCallback((workspace:WorkspaceSummary):Promise<WorkspaceSessionAccess[]>=>service.listWorkspaceSessions(workspace),[]);
  const setSessionRelease=useCallback(async(workspace:WorkspaceSummary,sessionId:string,released:boolean)=>{await service.setWorkspaceSessionRelease(workspace,sessionId,released);},[]);
  const loadMentorOverview=useCallback((workspace:WorkspaceSummary):Promise<MentorWorkspaceOverview>=>service.getMentorWorkspaceOverview(workspace),[]);
  const loadParticipantInvite=useCallback((workspace:WorkspaceSummary):Promise<ParticipantInvite|null>=>service.getParticipantInvite(workspace),[]);
  const createParticipantInvite=useCallback((workspace:WorkspaceSummary,maxUses:number,validDays:number):Promise<ParticipantInvite>=>service.createParticipantInvite(workspace,maxUses,validDays),[]);
  const revokeParticipantInvite=useCallback((workspace:WorkspaceSummary):Promise<void>=>service.revokeParticipantInvite(workspace),[]);
  const loadParticipants=useCallback((workspace:WorkspaceSummary):Promise<WorkspaceParticipant[]>=>service.listWorkspaceParticipants(workspace),[]);
  const loadCohortLearning=useCallback((workspace:WorkspaceSummary):Promise<CohortLearningRow[]>=>service.listCohortLearning(workspace),[]);
  const waitingForCurrentUser=auth.status==='loading'||(auth.status==='authenticated'&&loadedUserId!==auth.user?.id);
  const effectiveLoading=loading||waitingForCurrentUser;
  const value=useMemo<WorkspaceContextValue>(()=>({workspaces,loading:effectiveLoading,error,redeemCode,refresh,loadSessionAccess,setSessionRelease,loadMentorOverview,loadParticipantInvite,createParticipantInvite,revokeParticipantInvite,loadParticipants,loadCohortLearning}),[workspaces,effectiveLoading,error,redeemCode,refresh,loadSessionAccess,setSessionRelease,loadMentorOverview,loadParticipantInvite,createParticipantInvite,revokeParticipantInvite,loadParticipants,loadCohortLearning]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkspaces(){const value=useContext(Context);if(!value)throw new Error('useWorkspaces debe usarse dentro de WorkspaceProvider.');return value;}

export type WorkspaceRole='participant'|'mentor'|'org_admin';
export interface WorkspaceSummary {
  id:string;
  organization_id:string;
  organization_name:string;
  role:WorkspaceRole;
  can_manage:boolean;
  cohort_id:string;
  cohort_name:string;
  program_id:string;
  program_name:string;
  site_id:string|null;
  site_name:string|null;
  city:string|null;
  region:string|null;
}
export interface WorkspaceSessionAccess {
  session_id:string;
  released:boolean;
  can_manage:boolean;
}
export interface MentorWorkspaceOverview {
  participant_count:number;
  mentor_count:number;
  released_count:number;
}
export interface ParticipantInvite {
  code:string;
  max_uses:number|null;
  uses:number;
  expires_at:string;
  remaining_uses:number|null;
}
export interface CohortLearningRow {user_id:string;session_id:string;status:'visited'|'attempted'|'completed';updated_at:string}
export interface WorkspaceParticipant {
  user_id:string;
  display_name:string;
  joined_at:string;
}
export interface WorkspaceContextValue {
  workspaces:WorkspaceSummary[];
  loading:boolean;
  error:string|null;
  redeemCode:(code:string)=>Promise<WorkspaceSummary>;
  refresh:()=>Promise<void>;
  loadSessionAccess:(workspace:WorkspaceSummary)=>Promise<WorkspaceSessionAccess[]>;
  setSessionRelease:(workspace:WorkspaceSummary,sessionId:string,released:boolean)=>Promise<void>;
  loadMentorOverview:(workspace:WorkspaceSummary)=>Promise<MentorWorkspaceOverview>;
  loadParticipantInvite:(workspace:WorkspaceSummary)=>Promise<ParticipantInvite|null>;
  createParticipantInvite:(workspace:WorkspaceSummary,maxUses:number,validDays:number)=>Promise<ParticipantInvite>;
  revokeParticipantInvite:(workspace:WorkspaceSummary)=>Promise<void>;
  loadParticipants:(workspace:WorkspaceSummary)=>Promise<WorkspaceParticipant[]>;
  loadCohortLearning:(workspace:WorkspaceSummary)=>Promise<CohortLearningRow[]>;
}

import type {WorkspaceSummary} from './workspace-types';

const clean=(value:string)=>encodeURIComponent(value);

export function workspacePath(workspace:Pick<WorkspaceSummary,'organization_id'|'cohort_id'>){
  return `/espacios/${clean(workspace.organization_id)}/grupos/${clean(workspace.cohort_id)}`;
}
export function workspaceMentorPath(workspace:Pick<WorkspaceSummary,'organization_id'|'cohort_id'>){
  return `${workspacePath(workspace)}/mentor`;
}
export function workspaceSessionPath(workspace:Pick<WorkspaceSummary,'organization_id'|'cohort_id'>,sessionId:string){
  return `${workspacePath(workspace)}/intermedio/${clean(sessionId)}`;
}

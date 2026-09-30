import {describe,expect,it} from 'vitest';
import {workspaceMentorPath,workspacePath,workspaceSessionPath} from '../features/workspaces/workspace-paths';

const workspace={organization_id:'mustakis',cohort_id:'talca-2026-a'};

describe('institutional routes',()=>{
  it('carry organization and cohort identity',()=>{
    expect(workspacePath(workspace)).toBe('/espacios/mustakis/grupos/talca-2026-a');
    expect(workspaceMentorPath(workspace)).toBe('/espacios/mustakis/grupos/talca-2026-a/mentor');
    expect(workspaceSessionPath(workspace,'s02')).toBe('/espacios/mustakis/grupos/talca-2026-a/intermedio/s02');
  });
});

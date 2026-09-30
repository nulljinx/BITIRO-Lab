import {describe,expect,it} from 'vitest';
import type {WorkspaceSummary} from '../features/workspaces/workspace-types';
import {workspacePath} from '../features/workspaces/workspace-paths';

describe('workspace entry path',()=>{
  it('builds the direct destination used when the account has one workspace',()=>{
    const workspace={organization_id:'mustakis',cohort_id:'talca-2026'} as WorkspaceSummary;
    expect(workspacePath(workspace)).toBe('/espacios/mustakis/grupos/talca-2026');
  });
});

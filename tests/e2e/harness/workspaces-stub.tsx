// Stand-in for WorkspaceProvider: lets SpacesPage render without Supabase.
const workspaces=(window as any).__BITIRO_WORKSPACES__??[];
export function useWorkspaces(){return {workspaces,loading:false,error:null,redeemCode:async()=>{throw new Error('Código no válido o no disponible.');}};}

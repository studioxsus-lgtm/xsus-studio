// Supabase-backed identity and ownership adapter. Requires server-side injected clients.
// This module does not create clients, assume a database schema, or expose an HTTP endpoint.
const PROJECT_ID=/^[a-zA-Z0-9_-]{1,128}$/;
export function createSupabaseDeploymentContext({authClient,projectStore,artifactStore,accessToken}) {
  if (typeof authClient?.auth?.getUser!=='function' || typeof projectStore?.findOwnedProject!=='function' ||
      typeof artifactStore?.loadFiles!=='function' ||
      typeof accessToken!=='string' || !accessToken.trim())
    throw new TypeError('Trusted Supabase dependencies and bearer token are required');
  let authenticatedUser=null;
  return {
    async authenticate() {
      authenticatedUser=null;
      const {data,error}=await authClient.auth.getUser(accessToken);
      if (error || !data?.user?.id || typeof data.user.id!=='string')
        throw new Error('Authentication failed');
      // A failed reauthentication must never preserve an earlier identity.
      authenticatedUser={id:data.user.id};
      return {...authenticatedUser};
    },
    async authorizeProject(identity,projectId,target) {
      if (!authenticatedUser || identity?.id!==authenticatedUser.id ||
          !PROJECT_ID.test(projectId) ||
          !['static-host','github-pages','render-static'].includes(target)) return false;
      const project=await projectStore.findOwnedProject({
        projectId,ownerId:authenticatedUser.id
      });
      return project?.id===projectId && project?.ownerId===authenticatedUser.id;
    },
    async loadTrustedFiles(identity,projectId) {
      if (!authenticatedUser || identity?.id!==authenticatedUser.id || !PROJECT_ID.test(projectId))
        throw new Error('Unauthorized artifact access');
      // Recheck ownership here: validation service must not be the only access boundary.
      const project=await projectStore.findOwnedProject({projectId,ownerId:authenticatedUser.id});
      if (project?.id!==projectId || project?.ownerId!==authenticatedUser.id)
        throw new Error('Project ownership not verified');
      return artifactStore.loadFiles({projectId,ownerId:authenticatedUser.id});
    }
  };
}

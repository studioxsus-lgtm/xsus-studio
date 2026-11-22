// Read-only project ownership lookup for the existing XSUS App Supabase schema.
// Inject a server-controlled Supabase client. No credentials, migrations, or writes here.
import {isPersistedBuilderProjectId} from './project-id-contract.js';
export function createBuilderProjectStore(client) {
 if(typeof client?.from!=='function') throw new TypeError('Trusted Supabase client required');
 return Object.freeze({
  async findOwnedProject({projectId,ownerId}={}) {
   if(typeof projectId!=='string'||!isPersistedBuilderProjectId(projectId)||
      typeof ownerId!=='string'||!isPersistedBuilderProjectId(ownerId)) return null;
   const {data,error}=await client.from('xsus_builder_projects')
     .select('id,owner_id').eq('id',projectId).eq('owner_id',ownerId).maybeSingle();
   if(error || !data || data.id!==projectId || data.owner_id!==ownerId) return null;
   return {id:data.id,ownerId:data.owner_id};
  }
 });
}

// Read-only owner-scoped snapshot lookup for XSUS App.
// A retrieved snapshot remains untrusted user content; never use it as a deployable artifact.
import {isPersistedBuilderProjectId} from './project-id-contract.js';
import {inspectBuilderSnapshot} from './builder-snapshot-inspection.js';
export function createBuilderSnapshotReader(client) {
 if(typeof client?.from!=='function') throw new TypeError('Trusted Supabase client required');
 return Object.freeze({
  async inspectOwnedSnapshot({projectId,ownerId}={}) {
   if(!isPersistedBuilderProjectId(projectId)||!isPersistedBuilderProjectId(ownerId))
    return Object.freeze({found:false,supported:false,deployable:false});
   try {
    const {data,error}=await client.from('xsus_builder_projects')
     .select('id,owner_id,snapshot').eq('id',projectId).eq('owner_id',ownerId).maybeSingle();
    if(error||!data||data.id!==projectId||data.owner_id!==ownerId)
     return Object.freeze({found:false,supported:false,deployable:false});
    const inspection=inspectBuilderSnapshot(data.snapshot);
    return Object.freeze({found:true,supported:inspection.supported,
     hasGeneratedHtml:inspection.hasGeneratedHtml,deployable:false});
   } catch {
    return Object.freeze({found:false,supported:false,deployable:false});
   }
  }
 });
}

// Read-only revision evidence derived from the persisted server-fetched snapshot.
// No client-supplied saveToken is trusted. A digest is comparison evidence,
// not an authorization credential or a database transaction lock.
import {digestPersistedSnapshot} from './snapshot-revision-digest.js';
import {isPersistedBuilderProjectId} from './project-id-contract.js';
export function createBuilderProjectRevisionReader(client) {
 if(typeof client?.from!=='function') throw new TypeError('Trusted Supabase client required');
 return Object.freeze({
  async readOwnedRevision({projectId,ownerId}={}) {
   if(!isPersistedBuilderProjectId(projectId)||!isPersistedBuilderProjectId(ownerId)) return null;
   try {
    const {data,error}=await client.from('xsus_builder_projects')
     .select('id,owner_id,snapshot').eq('id',projectId).eq('owner_id',ownerId).maybeSingle();
    if(error||!data||data.id!==projectId||data.owner_id!==ownerId||
       !data.snapshot||typeof data.snapshot!=='object'||Array.isArray(data.snapshot)) return null;
    return digestPersistedSnapshot(data.snapshot);
   } catch { return null; }
  }
 });
}

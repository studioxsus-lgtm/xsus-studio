// Read-only revision evidence derived from the persisted server-fetched snapshot.
// No client-supplied saveToken is trusted. A digest is comparison evidence,
// not an authorization credential or a database transaction lock.
import {createHash} from 'node:crypto';
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
    const raw=JSON.stringify(data.snapshot);
    if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>4194304) return null;
    return createHash('sha256').update(raw,'utf8').digest('hex');
   } catch { return null; }
  }
 });
}

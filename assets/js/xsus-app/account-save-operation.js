import {classifyAccountSaveResult} from './account-autosave-policy.js';
// Single optimistic-concurrency write contract shared by manual save and autosave.
// A missing row is a conflict, never a successful write.
export async function updateLinkedAccountProject(client,{table='xsus_builder_projects',owner,id,token,snapshot,name}){
  if(!client||!owner||!id||!snapshot)throw new TypeError('Invalid linked project update');
  let query=client.from(table).update(name===undefined?{snapshot}:{name,snapshot})
    .eq('owner_id',owner).eq('id',id);
  query=token==null?query.is('snapshot->>saveToken',null):query.eq('snapshot->>saveToken',token);
  const {data,error}=await query.select('id').maybeSingle();
  return classifyAccountSaveResult(error,data?.id,id);
}

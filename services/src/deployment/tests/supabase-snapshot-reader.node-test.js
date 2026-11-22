import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuilderSnapshotReader} from '../supabase-snapshot-reader.js';
const projectId='11111111-1111-4111-8111-111111111111',ownerId='22222222-2222-4222-8222-222222222222';
const snapshot={version:1,session:{messages:[],generatedHtml:'<html>secret</html>'},reviews:[],boards:[],goal:'private'};
function client({data={id:projectId,owner_id:ownerId,snapshot},error=null}={}) {
 const filters=[];
 const query={select(value){assert.equal(value,'id,owner_id,snapshot');return this;},
  eq(key,value){filters.push([key,value]);return this;},
  async maybeSingle(){assert.deepEqual(filters,[['id',projectId],['owner_id',ownerId]]);return {data,error};}};
 return {from(table){assert.equal(table,'xsus_builder_projects');return query;}};
}
test('owner-scoped lookup inspects snapshot without returning private content',async()=>{
 const result=await createBuilderSnapshotReader(client()).inspectOwnedSnapshot({projectId,ownerId});
 assert.equal(result.found,true);assert.equal(result.supported,true);
 assert.equal(result.hasGeneratedHtml,true);assert.equal(result.deployable,false);
 assert.equal(JSON.stringify(result).includes('secret'),false);
 assert.equal(JSON.stringify(result).includes('private'),false);
});
test('invalid IDs are rejected before querying',async()=>{
 const result=await createBuilderSnapshotReader({from(){throw Error('must not query');}})
  .inspectOwnedSnapshot({projectId:'bad',ownerId});
 assert.equal(result.found,false);
});
test('wrong owner or missing row fails closed',async()=>{
 for(const data of [null,{id:projectId,owner_id:'33333333-3333-4333-8333-333333333333',snapshot}]){
  const result=await createBuilderSnapshotReader(client({data})).inspectOwnedSnapshot({projectId,ownerId});
  assert.equal(result.found,false);assert.equal(result.deployable,false);
 }
});
test('database errors and exceptions fail closed',async()=>{
 const a=await createBuilderSnapshotReader(client({error:{message:'secret'}}))
  .inspectOwnedSnapshot({projectId,ownerId});
 const b=await createBuilderSnapshotReader({from(){throw Error('private');}})
  .inspectOwnedSnapshot({projectId,ownerId});
 assert.equal(a.found,false);assert.equal(b.found,false);
});
test('unsupported snapshot never becomes deployable',async()=>{
 const result=await createBuilderSnapshotReader(client({data:{id:projectId,owner_id:ownerId,snapshot:{version:99}}}))
  .inspectOwnedSnapshot({projectId,ownerId});
 assert.equal(result.found,true);assert.equal(result.supported,false);assert.equal(result.deployable,false);
});

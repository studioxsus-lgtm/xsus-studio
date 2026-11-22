import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuilderProjectRevisionReader} from '../supabase-project-revision-reader.js';
import {inspectStableProjectRevision} from '../project-revision-contract.js';
const projectId='11111111-1111-4111-8111-111111111111',ownerId='22222222-2222-4222-8222-222222222222';
function client(rows) {
 const filters=[];
 const query={select(fields){assert.equal(fields,'id,owner_id,snapshot');return this;},
  eq(key,value){filters.push([key,value]);return this;},
  async maybeSingle(){
   assert.deepEqual(filters,[['id',projectId],['owner_id',ownerId]]);
   filters.length=0;
   const next=rows.shift();
   if(next instanceof Error) throw next;
   return next;
  }};
 return {from(table){assert.equal(table,'xsus_builder_projects');return query;}};
}
const row=snapshot=>({data:{id:projectId,owner_id:ownerId,snapshot},error:null});
test('unchanged saved snapshot yields stable digest without returning content',async()=>{
 const snapshot={version:1,session:{generatedHtml:'private code'}};
 const reader=createBuilderProjectRevisionReader(client([row(snapshot),row(snapshot)]));
 const before=await reader.readOwnedRevision({projectId,ownerId});
 const after=await reader.readOwnedRevision({projectId,ownerId});
 assert.match(before,/^[a-f0-9]{64}$/);
 assert.equal(inspectStableProjectRevision(before,after).stable,true);
 assert.equal(before.includes('private'),false);
});
test('modified snapshot yields changed revision',async()=>{
 const reader=createBuilderProjectRevisionReader(client([row({version:1}),row({version:2})]));
 const before=await reader.readOwnedRevision({projectId,ownerId});
 const after=await reader.readOwnedRevision({projectId,ownerId});
 assert.equal(inspectStableProjectRevision(before,after).reason,'PROJECT_REVISION_CHANGED');
});
test('owner mismatch and missing rows fail closed',async()=>{
 const wrong={data:{id:projectId,owner_id:'33333333-3333-4333-8333-333333333333',snapshot:{}},error:null};
 const reader=createBuilderProjectRevisionReader(client([wrong,{data:null,error:null}]));
 assert.equal(await reader.readOwnedRevision({projectId,ownerId}),null);
 assert.equal(await reader.readOwnedRevision({projectId,ownerId}),null);
});
test('database errors and invalid snapshots fail closed',async()=>{
 const reader=createBuilderProjectRevisionReader(client([
  {data:null,error:{message:'private'}},row(null),new Error('secret')]));
 for(let i=0;i<3;i++) assert.equal(await reader.readOwnedRevision({projectId,ownerId}),null);
});
test('invalid IDs reject before database access',async()=>{
 const reader=createBuilderProjectRevisionReader({from(){throw Error('must not query');}});
 assert.equal(await reader.readOwnedRevision({projectId:'bad',ownerId}),null);
});

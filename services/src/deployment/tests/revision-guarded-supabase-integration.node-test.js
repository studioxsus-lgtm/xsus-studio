import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuilderProjectStore} from '../supabase-project-store.js';
import {createBuilderProjectRevisionReader} from '../supabase-project-revision-reader.js';
import {reviewBuildWithRevisionGuard} from '../revision-guarded-build-review.js';

const projectId='11111111-1111-4111-8111-111111111111';
const ownerId='22222222-2222-4222-8222-222222222222';
const args={projectId,ownerId};
const files={'index.html':'<html><head></head><body>ok</body></html>',
 'styles.css':'body{}','app.js':'console.log(1)'};
function mockClient(state) {
 return {from(table){
  assert.equal(table,'xsus_builder_projects');
  const filters=[];
  return {
   select(columns){assert.ok(['id,owner_id','id,owner_id,snapshot'].includes(columns));this.columns=columns;return this;},
   eq(key,value){filters.push([key,value]);return this;},
   async maybeSingle(){
    assert.deepEqual(filters,[['id',projectId],['owner_id',ownerId]]);
    if(!state.exists||state.ownerId!==ownerId) return {data:null,error:null};
    const data={id:projectId,owner_id:state.ownerId};
    if(this.columns==='id,owner_id,snapshot') data.snapshot=structuredClone(state.snapshot);
    return {data,error:null};
   }
  };
 }};
}
function setup(state,buildFromSavedProject) {
 const client=mockClient(state);
 const store=createBuilderProjectStore(client);
 const reader=createBuilderProjectRevisionReader(client);
 return {findOwnedProject:store.findOwnedProject,
  readOwnedRevision:reader.readOwnedRevision,buildFromSavedProject};
}
test('owner-scoped Supabase adapters permit review of unchanged saved project',async()=>{
 const state={exists:true,ownerId,snapshot:{version:1,session:{goal:'demo'}}};
 const result=await reviewBuildWithRevisionGuard(args,setup(state,async()=>files));
 assert.equal(result.status,'ready-for-review');
 assert.equal(result.deployed,false);
 assert.equal(result.manifest.deployable,false);
});
test('saved snapshot edited during server build is denied',async()=>{
 const state={exists:true,ownerId,snapshot:{version:1,session:{goal:'A'}}};
 const result=await reviewBuildWithRevisionGuard(args,setup(state,async()=>{
  state.snapshot.session.goal='B';
  return files;
 }));
 assert.equal(result.reason,'PROJECT_REVISION_CHANGED');
 assert.equal(result.manifest,null);
});
test('owner reassigned during build is denied',async()=>{
 const state={exists:true,ownerId,snapshot:{version:1}};
 const result=await reviewBuildWithRevisionGuard(args,setup(state,async()=>{
  state.ownerId='33333333-3333-4333-8333-333333333333';
  return files;
 }));
 assert.equal(result.status,'denied');
 assert.equal(result.deployed,false);
});
test('project deleted during build is denied',async()=>{
 const state={exists:true,ownerId,snapshot:{version:1}};
 const result=await reviewBuildWithRevisionGuard(args,setup(state,async()=>{
  state.exists=false;
  return files;
 }));
 assert.equal(result.status,'denied');
 assert.equal(result.deployed,false);
});

test('owner reassigned after final digest read is rejected',async()=>{
 const state={exists:true,ownerId,snapshot:{version:1}};
 const client=mockClient(state);
 const store=createBuilderProjectStore(client);
 const reader=createBuilderProjectRevisionReader(client);
 let revisionReads=0;
 const result=await reviewBuildWithRevisionGuard(args,{
  findOwnedProject:store.findOwnedProject,
  readOwnedRevision:async identity=>{
   const digest=await reader.readOwnedRevision(identity);
   if(++revisionReads===2) state.ownerId='33333333-3333-4333-8333-333333333333';
   return digest;
  },
  buildFromSavedProject:async()=>files
 });
 assert.equal(revisionReads,2);
 assert.equal(result.reason,'PROJECT_OWNERSHIP_CHANGED');
 assert.equal(result.deployed,false);
});
test('snapshot changes after build review but before final digest read are rejected',async()=>{
 const state={exists:true,ownerId,snapshot:{version:1}};
 const client=mockClient(state);
 const store=createBuilderProjectStore(client);
 const reader=createBuilderProjectRevisionReader(client);
 let ownerChecks=0;
 const result=await reviewBuildWithRevisionGuard(args,{
  findOwnedProject:async identity=>{
   const owner=await store.findOwnedProject(identity);
   if(++ownerChecks===2) state.snapshot.version=2;
   return owner;
  },
  readOwnedRevision:reader.readOwnedRevision,
  buildFromSavedProject:async()=>files
 });
 assert.equal(result.reason,'PROJECT_REVISION_CHANGED');
 assert.equal(result.deployed,false);
});

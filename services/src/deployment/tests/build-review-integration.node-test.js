import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuilderProjectStore} from '../supabase-project-store.js';
import {reviewSavedProjectBuild} from '../build-review-pipeline.js';

const projectId='11111111-1111-4111-8111-111111111111';
const ownerId='22222222-2222-4222-8222-222222222222';
const files={'index.html':'<!doctype html><html><head></head><body>ok</body></html>',
 'styles.css':'body{}','app.js':'console.log(1)'};

function ownerScopedClient({row={id:projectId,owner_id:ownerId},error=null}={}) {
 const filters=[];
 const query={
  select(columns){assert.equal(columns,'id,owner_id');return this;},
  eq(key,value){filters.push([key,value]);return this;},
  async maybeSingle(){
   assert.deepEqual(filters,[['id',projectId],['owner_id',ownerId]]);
   return {data:row,error};
  }
 };
 return {from(table){assert.equal(table,'xsus_builder_projects');return query;}};
}
function dependencies(client,builder=async()=>files) {
 const store=createBuilderProjectStore(client);
 return {findOwnedProject:input=>store.findOwnedProject(input),
  buildFromSavedProject:builder};
}
test('owner-scoped Supabase lookup and static build review compose safely',async()=>{
 const result=await reviewSavedProjectBuild({projectId,ownerId},dependencies(ownerScopedClient()));
 assert.equal(result.status,'ready-for-review');
 assert.equal(result.deployed,false);
 assert.equal(result.manifest.deployable,false);
 assert.equal(result.manifest.verifiedSource,false);
});
test('missing project denies before builder executes',async()=>{
 let called=false;
 const result=await reviewSavedProjectBuild({projectId,ownerId},
  dependencies(ownerScopedClient({row:null}),async()=>{called=true;return files;}));
 assert.equal(result.status,'denied');assert.equal(called,false);
});
test('Supabase error denies before builder executes',async()=>{
 let called=false;
 const result=await reviewSavedProjectBuild({projectId,ownerId},
  dependencies(ownerScopedClient({error:{message:'private db error'}}),async()=>{called=true;return files;}));
 assert.equal(result.status,'denied');assert.equal(called,false);
 assert.equal(JSON.stringify(result).includes('private'),false);
});
test('mismatched owner denies before builder executes',async()=>{
 let called=false;
 const result=await reviewSavedProjectBuild({projectId,ownerId},
  dependencies(ownerScopedClient({row:{id:projectId,owner_id:'33333333-3333-4333-8333-333333333333'}}),
   async()=>{called=true;return files;}));
 assert.equal(result.status,'denied');assert.equal(called,false);
});
test('saved browser snapshot is never used as a build artifact source',async()=>{
 const snapshot={version:1,session:{messages:[],generatedHtml:'<html>untrusted</html>'},reviews:[],boards:[]};
 const result=await reviewSavedProjectBuild({projectId,ownerId},
  dependencies(ownerScopedClient(),async()=>snapshot));
 assert.equal(result.status,'denied');assert.equal(result.deployed,false);
});

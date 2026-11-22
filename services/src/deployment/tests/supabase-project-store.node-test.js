import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuilderProjectStore} from '../supabase-project-store.js';
const id='11111111-1111-4111-8111-111111111111';
const owner='22222222-2222-4222-8222-222222222222';
function mock({data={id,owner_id:owner},error=null}={}) {
 const calls=[];
 const query={
  select(value){calls.push(['select',value]);return this;},
  eq(column,value){calls.push(['eq',column,value]);return this;},
  async maybeSingle(){calls.push(['maybeSingle']);return {data,error};}
 };
 return {calls,client:{from(table){calls.push(['from',table]);return query;}}};
}
test('uses existing table and enforces owner in query',async()=>{
 const f=mock();const result=await createBuilderProjectStore(f.client).findOwnedProject({projectId:id,ownerId:owner});
 assert.deepEqual(result,{id,ownerId:owner});
 assert.deepEqual(f.calls,[['from','xsus_builder_projects'],['select','id,owner_id'],['eq','id',id],['eq','owner_id',owner],['maybeSingle']]);
});
test('rejects non-UUID project ID before any database query',async()=>{
 const f=mock();assert.equal(await createBuilderProjectStore(f.client).findOwnedProject({projectId:'project_123',ownerId:owner}),null);
 assert.equal(f.calls.length,0);
});
test('rejects invalid owner ID before any database query',async()=>{
 const f=mock();assert.equal(await createBuilderProjectStore(f.client).findOwnedProject({projectId:id,ownerId:'attacker'}),null);
 assert.equal(f.calls.length,0);
});
test('rejects records with mismatched owner even when returned by client',async()=>{
 const f=mock({data:{id,owner_id:'33333333-3333-4333-8333-333333333333'}});
 assert.equal(await createBuilderProjectStore(f.client).findOwnedProject({projectId:id,ownerId:owner}),null);
});
test('fails closed on query error or missing record',async()=>{
 for(const result of [{data:null},{error:{message:'denied'}}]){
  const f=mock(result);
  assert.equal(await createBuilderProjectStore(f.client).findOwnedProject({projectId:id,ownerId:owner}),null);
 }
});

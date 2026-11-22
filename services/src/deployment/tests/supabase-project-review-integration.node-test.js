import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseProjectReviewIntegration} from '../supabase-project-review-integration.js';
const projectId='11111111-1111-4111-8111-111111111111';
const ownerId='22222222-2222-4222-8222-222222222222';
const token='valid-token-for-tests-123456';
function setup({authenticated=true,owned=true,build=async()=>null}={}) {
 const calls=[];
 const client={
  auth:{getUser:async value=>{calls.push(['auth',value]);return authenticated?
   {data:{user:{id:ownerId}},error:null}:{data:{user:null},error:{message:'invalid'}};}},
  from:table=>{
   assert.equal(table,'xsus_builder_projects');
   const state={};
   const query={
    select(fields){state.fields=fields;return this;},
    eq(key,value){state[key]=value;return this;},
    async maybeSingle(){
     calls.push(['read',state]);
     assert.equal(state.id,projectId);
     assert.equal(state.owner_id,ownerId);
     return {data:owned?{id:projectId,owner_id:ownerId,snapshot:{version:1}}:null,error:null};
    }
   };
   return query;
  }
 };
 const integration=createSupabaseProjectReviewIntegration({supabaseClient:client,
  buildFromSavedProject:async args=>{calls.push(['build',args]);return build(args);}});
 return {integration,calls};
}
test('composition refuses missing trusted dependencies',()=>{
 assert.throws(()=>createSupabaseProjectReviewIntegration(),TypeError);
 assert.throws(()=>createSupabaseProjectReviewIntegration({buildFromSavedProject:()=>{}}),TypeError);
});
test('invalid authentication prevents all database and builder reads',async()=>{
 const {integration,calls}=setup({authenticated:false});
 const result=await integration.projectReviewer.review({accessToken:token,projectId});
 assert.equal(result.reason,'UNAUTHENTICATED');
 assert.deepEqual(calls.map(([name])=>name),['auth']);
});
test('ownership denial prevents the builder from running',async()=>{
 const {integration,calls}=setup({owned:false});
 const result=await integration.projectReviewer.review({accessToken:token,projectId});
 assert.equal(result.reason,'UNVERIFIED_PROJECT_REVISION');
 assert.equal(calls.some(([name])=>name==='build'),false);
});
test('verified identity is used for every scoped database read and build',async()=>{
 const {integration,calls}=setup();
 const result=await integration.projectReviewer.review({accessToken:token,projectId,
  ownerId:'33333333-3333-4333-8333-333333333333'});
 assert.equal(result.deployed,false);
 assert.equal(result.reason,'BUILD_PREFLIGHT_FAILED');
 assert.deepEqual(calls.map(([name])=>name),['auth','read','read','build']);
 assert.deepEqual(calls.find(([name])=>name==='build')[1],{projectId,ownerId});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseRestReviewClient} from '../supabase-rest-review-client.js';
import {createSupabaseProjectReviewIntegration} from '../supabase-project-review-integration.js';
const projectId='11111111-1111-4111-8111-111111111111';
const ownerId='22222222-2222-4222-8222-222222222222';
const otherId='33333333-3333-4333-8333-333333333333';
const token='x'.repeat(40);
const url='https://example.supabase.co';
function setup({user=ownerId,allowRow=true}={}) {
 const requests=[];let builds=0;
 const client=createSupabaseRestReviewClient({url,publishableKey:'sb_publishable_test',accessToken:token,
  fetchImpl:async (path,init)=>{
   requests.push({path,init});
   if(path.endsWith('/auth/v1/user'))
    return {ok:true,json:async()=>({id:user})};
   const query=new URL(path).searchParams;
   if(!allowRow || query.get('owner_id')!=='eq.'+ownerId)
    return {ok:false,status:406};
   return {ok:true,json:async()=>({id:projectId,owner_id:ownerId,snapshot:{version:1,goal:'test'}})};
  }});
 const integration=createSupabaseProjectReviewIntegration({supabaseClient:client,
  buildFromSavedProject:async()=>{builds++;return null;}});
 return {review:integration.projectReviewer.review,requests,get builds(){return builds;}};
}
test('owner token reaches server builder only after RLS-scoped reads',async()=>{
 const t=setup();
 const result=await t.review({accessToken:token,projectId,ownerId:otherId});
 assert.equal(result.reason,'BUILD_PREFLIGHT_FAILED');
 assert.equal(result.deployed,false);
 assert.equal(t.builds,1);
 assert.equal(t.requests.length,3);
 for(const request of t.requests)
  assert.equal(request.init.headers.authorization,'Bearer '+token);
 for(const request of t.requests.slice(1)){
  const query=new URL(request.path).searchParams;
  assert.equal(query.get('id'),'eq.'+projectId);
  assert.equal(query.get('owner_id'),'eq.'+ownerId);
 }
});
test('another authenticated user cannot read or build the project',async()=>{
 const t=setup({user:otherId});
 const result=await t.review({accessToken:token,projectId});
 assert.equal(result.status,'denied');
 assert.equal(result.deployed,false);
 assert.equal(t.builds,0);
 assert.equal(t.requests.length,2);
});
test('RLS-hidden project cannot reach the builder',async()=>{
 const t=setup({allowRow:false});
 const result=await t.review({accessToken:token,projectId});
 assert.equal(result.status,'denied');
 assert.equal(t.builds,0);
});

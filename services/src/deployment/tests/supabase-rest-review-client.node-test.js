import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseRestReviewClient} from '../supabase-rest-review-client.js';
const url='https://example.supabase.co',publishableKey='sb_publishable_example',accessToken='x'.repeat(30);
const owner='22222222-2222-4222-8222-222222222222',id='11111111-1111-4111-8111-111111111111';
test('rejects missing or nonpublishable credentials',()=>{
 assert.throws(()=>createSupabaseRestReviewClient({url,publishableKey:'service_role_secret',accessToken}),TypeError);
 assert.throws(()=>createSupabaseRestReviewClient({url:'http://example.com',publishableKey,accessToken}),TypeError);
});
test('Auth user lookup and RLS project query use caller token',async()=>{
 const requests=[];
 const client=createSupabaseRestReviewClient({url,publishableKey,accessToken,fetchImpl:async(input,init)=>{
  requests.push({input,init});
  if(input.endsWith('/auth/v1/user'))return {ok:true,json:async()=>({id:owner})};
  return {ok:true,json:async()=>({id,owner_id:owner,snapshot:{version:1}})};
 }});
 assert.deepEqual((await client.auth.getUser(accessToken)).data.user,{id:owner});
 const result=await client.from('xsus_builder_projects').select('id,owner_id,snapshot')
  .eq('id',id).eq('owner_id',owner).maybeSingle();
 assert.equal(result.data.owner_id,owner);
 assert.equal(requests.length,2);
 for(const req of requests){
  assert.equal(req.init.headers.authorization,'Bearer '+accessToken);
  assert.equal(req.init.headers.apikey,publishableKey);
 }
 assert.match(requests[1].input,/owner_id=eq/);
});
test('token mismatch and unscoped queries fail closed',async()=>{
 let calls=0;
 const client=createSupabaseRestReviewClient({url,publishableKey,accessToken,
  fetchImpl:async()=>{calls++;throw Error('should not be called');}});
 assert.ok((await client.auth.getUser('wrong')).error);
 assert.ok((await client.from('xsus_builder_projects').select('id,owner_id').maybeSingle()).error);
 assert.equal(calls,0);
});
test('RLS denied row is not returned',async()=>{
 const client=createSupabaseRestReviewClient({url,publishableKey,accessToken,
  fetchImpl:async()=>({ok:false,status:406})});
 const result=await client.from('xsus_builder_projects').select('id,owner_id')
  .eq('id',id).eq('owner_id',owner).maybeSingle();
 assert.equal(result.data,null);
});

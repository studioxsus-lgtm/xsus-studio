import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseAccessTokenVerifier} from '../supabase-access-token-verifier.js';
const userId='22222222-2222-4222-8222-222222222222';
const token='verified-token-example-12345';
test('requires trusted auth client',()=>{
 assert.throws(()=>createSupabaseAccessTokenVerifier({}),TypeError);
});
test('returns only server-verified user ID',async()=>{
 const calls=[];
 const verify=createSupabaseAccessTokenVerifier({auth:{getUser:async value=>{
  calls.push(value);return {data:{user:{id:userId,email:'private@example.com'}},error:null};
 }}});
 assert.deepEqual(await verify(token),{sub:userId});
 assert.deepEqual(calls,[token]);
});
test('rejects invalid token format before calling Supabase',async()=>{
 let called=0;
 const verify=createSupabaseAccessTokenVerifier({auth:{getUser:async()=>{called++;return {data:{user:{id:userId}}};}}});
 for(const value of [null,'short','bad token with spaces','x'.repeat(8193)])
  assert.equal(await verify(value),null);
 assert.equal(called,0);
});
test('rejects Supabase errors and absent or malformed users',async()=>{
 for(const response of [{data:{user:{id:userId}},error:{message:'invalid'}},
  {data:{user:null},error:null},{data:{user:{id:'invalid'}},error:null}]) {
  const verify=createSupabaseAccessTokenVerifier({auth:{getUser:async()=>response}});
  assert.equal(await verify(token),null);
 }
});
test('fails closed when Supabase is unavailable',async()=>{
 const verify=createSupabaseAccessTokenVerifier({auth:{getUser:async()=>{throw Error('offline');}}});
 assert.equal(await verify(token),null);
});

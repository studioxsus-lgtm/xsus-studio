import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneDeploymentServer} from '../standalone-server.js';
const projectId='11111111-1111-4111-8111-111111111111';
const origin='https://www.xsusstudio.com';
async function withServer(deps,run){
 const server=createStandaloneDeploymentServer(deps);
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
 try {await run('http://127.0.0.1:'+server.address().port);}
 finally {await new Promise((ok,fail)=>server.close(e=>e?fail(e):ok()));}
}
const request=(base,options={})=>fetch(base+'/api/projects/review',{method:'POST',
 headers:{origin,'content-type':'application/json',authorization:'Bearer '+('a'.repeat(24)),...options.headers},
 body:JSON.stringify({projectId,...options.body})});
test('review route remains unavailable without trusted server reviewer',async()=>{
 await withServer({allowedOrigins:[origin]},async base=>{
  const res=await request(base);assert.equal(res.status,503);
  assert.equal((await res.json()).deployed,false);
 });
});
test('review rejects unapproved origins without invoking reviewer',async()=>{
 let calls=0;
 await withServer({allowedOrigins:[origin],projectReviewer:{review:async()=>{calls++;return {status:'ready-for-review',deployed:false};}}},async base=>{
  const res=await request(base,{headers:{origin:'https://evil.example'}});
  assert.equal(res.status,403);assert.equal(calls,0);
 });
});
test('review rejects malformed project IDs before invoking reviewer',async()=>{
 let calls=0;
 await withServer({allowedOrigins:[origin],projectReviewer:{review:async()=>{calls++;}}},async base=>{
  const res=await request(base,{body:{projectId:'not-a-uuid'}});
  assert.equal(res.status,400);assert.equal(calls,0);
 });
});
test('review forwards only bearer token and project ID to trusted reviewer',async()=>{
 let args;
 await withServer({allowedOrigins:[origin],projectReviewer:{review:async value=>{
  args=value;return {status:'ready-for-review',deployed:false,manifest:{secret:'hidden'}};
 }}},async base=>{
  const res=await request(base,{body:{ownerId:'attacker'}});
  assert.equal(res.status,200);
  assert.deepEqual(args,{projectId,accessToken:'a'.repeat(24)});
  assert.deepEqual(await res.json(),{status:'ready-for-review',reason:'STATIC_REVIEW_ONLY',deployed:false});
 });
});
test('review denies unverified results without disclosing internal reasons',async()=>{
 await withServer({allowedOrigins:[origin],projectReviewer:{review:async()=>({status:'denied',reason:'private',deployed:false})}},async base=>{
  const res=await request(base);assert.equal(res.status,403);
  assert.deepEqual(await res.json(),{status:'denied',reason:'REVIEW_DENIED',deployed:false});
 });
});

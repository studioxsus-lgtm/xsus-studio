// Opt-in live smoke test. No credentials, no project data, no writes.
import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.XSUS_APP_SMOKE_URL;
const origin='https://www.xsusstudio.com';
const id='11111111-1111-4111-8111-111111111111';
test('live XSUS App review rejects missing bearer token', {skip:!base}, async()=>{
 const response=await fetch(new URL('/api/projects/review',base),{
  method:'POST',headers:{origin,'content-type':'application/json'},
  body:JSON.stringify({projectId:id}),signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,401);
 assert.equal((await response.json()).deployed,false);
});
test('live XSUS App review rejects unapproved origin', {skip:!base}, async()=>{
 const response=await fetch(new URL('/api/projects/review',base),{
  method:'POST',headers:{origin:'https://invalid.example','content-type':'application/json',
   authorization:'Bearer '+ 'x'.repeat(30)},
  body:JSON.stringify({projectId:id}),signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,403);
 assert.equal((await response.json()).deployed,false);
});
test('live XSUS App health reports deployment disabled', {skip:!base}, async()=>{
 const response=await fetch(new URL('/healthz',base),{signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.ok,true);
 assert.equal(body.deploymentEnabled,false);
});

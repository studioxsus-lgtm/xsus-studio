// Non-destructive staging HTTP contract probe. No user credentials, database writes, or preview builds.
import assert from 'node:assert/strict';

const endpoint='https://xsus-app-build-api-staging.onrender.com/api/projects/build-preview';
const allowedOrigin='https://www.xsusstudio.com';
const foreignOrigin='https://untrusted.example';
async function probe(label,method,headers,expected,body){
 const response=await fetch(endpoint,{method,headers,body,signal:AbortSignal.timeout(25000),redirect:'manual'});
 assert.equal(response.status,expected,label+' HTTP status');
 assert.equal(response.headers.get('cache-control'),'no-store',label+' cache policy');
 assert.equal(response.headers.get('access-control-allow-origin'),headers.origin===allowedOrigin?allowedOrigin:null,label+' CORS origin');
 console.log('[xsus-staging-http]',JSON.stringify({label,status:response.status,ok:true}));
}
await probe('originless-post','POST',{'content-type':'application/json'},403,'{}');
await probe('foreign-origin-post','POST',{origin:foreignOrigin,'content-type':'application/json'},403,'{}');
await probe('missing-token-post','POST',{origin:allowedOrigin,'content-type':'application/json'},401,JSON.stringify({projectId:'33333333-3333-4333-8333-333333333333'}));
await probe('invalid-preflight-header','OPTIONS',{origin:allowedOrigin,'access-control-request-method':'POST','access-control-request-headers':'x-admin-token'},403);
const preflight=await fetch(endpoint,{method:'OPTIONS',headers:{origin:allowedOrigin,'access-control-request-method':'POST','access-control-request-headers':'authorization, content-type'},signal:AbortSignal.timeout(25000),redirect:'manual'});
assert.equal(preflight.status,204,'allowed preflight HTTP status');
assert.equal(preflight.headers.get('access-control-allow-origin'),allowedOrigin,'allowed preflight origin');
assert.match(preflight.headers.get('access-control-allow-headers')||'',/authorization/i);
console.log('[xsus-staging-http]',JSON.stringify({label:'allowed-preflight',status:204,ok:true}));

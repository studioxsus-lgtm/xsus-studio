import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationGateway} from '../gateway.mjs';
async function fixture(t){const g=createGenerationGateway({generate:async()=>({status:'draft'}),verifyIdentity:async token=>['a','b'].includes(token)?{id:token}:null});await new Promise(r=>g.server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{g.server.close(r);g.server.closeAllConnections()}));const base='http://127.0.0.1:'+g.server.address().port;const call=(path,method='GET',token='a',body)=>fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});return {g,call}}
const input={name:'Site',prompt:'Create website'};
test('health',async t=>{const {call}=await fixture(t);assert.equal((await call('/health','GET',null)).status,200)});
test('readiness',async t=>{const {g,call}=await fixture(t);assert.equal((await call('/ready')).status,200);g.stopAccepting();assert.equal((await call('/ready')).status,503)});
test('submit',async t=>{const {call}=await fixture(t);const r=await call('/jobs','POST','a',input);assert.equal(r.status,202);assert.equal((await r.json()).publicationAuthorized,false)});
test('missing token',async t=>{const {call}=await fixture(t);assert.equal((await call('/jobs','POST',null,input)).status,401)});
test('invalid token',async t=>{const {call}=await fixture(t);assert.equal((await call('/jobs','POST','bad',input)).status,401)});
test('invalid input',async t=>{const {call}=await fixture(t);assert.equal((await call('/jobs','POST','a',{})).status,400)});
test('content type required',async t=>{const {call}=await fixture(t);assert.equal((await call('/jobs','POST')).status,415)});
test('unknown route',async t=>{const {call}=await fixture(t);assert.equal((await call('/unknown')).status,404)});
test('method rejected',async t=>{const {call}=await fixture(t);assert.equal((await call('/jobs')).status,405)});
test('owner isolation',async t=>{const {call}=await fixture(t);const j=await (await call('/jobs','POST','a',input)).json();assert.equal((await call('/jobs/'+j.id,'GET','b')).status,404)});
test('job status',async t=>{const {call}=await fixture(t);const j=await (await call('/jobs','POST','a',input)).json();assert.equal((await call('/jobs/'+j.id)).status,200)});
test('job result',async t=>{const {call}=await fixture(t);const j=await (await call('/jobs','POST','a',input)).json();const r=await call('/jobs/'+j.id+'/result');assert.equal(r.status,200);assert.deepEqual(await r.json(),{status:'draft'})});
test('shutdown rejects new jobs',async t=>{const {g,call}=await fixture(t);g.stopAccepting();assert.equal((await call('/jobs','POST','a',input)).status,503)});
test('no cache',async t=>{const {call}=await fixture(t);assert.equal((await call('/health')).headers.get('cache-control'),'no-store')});

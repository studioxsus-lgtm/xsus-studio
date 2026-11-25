import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPersistentProduction} from '../production.mjs';
const users={alice:'12345678-1234-1234-1234-123456789abc',bob:'22345678-1234-1234-1234-123456789abc'};
async function fixture(t,{fail=false}={}){
 const directory=await mkdtemp(join(tmpdir(),'xsus-e2e-'));const servers=[];t.after(async()=>{for(const s of servers)await new Promise(r=>{s.close(r);s.closeAllConnections()});await rm(directory,{recursive:true,force:true})});
 const env={XSUS_DATA_DIRECTORY:directory,XSUS_AUTH_URL:'https://auth.example',XSUS_AUTH_PUBLIC_KEY:'public',XSUS_FUTURE_URL:'https://future.example/interpret',XSUS_HYPER_URL:'https://hyper.example/plan',XSUS_FUTURE_TOKEN:'future-secret',XSUS_HYPER_TOKEN:'hyper-secret'};
 const calls=[];
 const fetchImpl=async(url,o)=>{const u=new URL(url);calls.push(u.hostname);
 if(u.hostname==='auth.example'){const id=users[o.headers.Authorization.slice(7)];return id?Response.json({id}):new Response('',{status:401})}
 const body=JSON.parse(o.body);assert.equal(body.executionAllowed,false);
 if(u.hostname==='future.example'){assert.equal(o.headers.Authorization,'Bearer future-secret');return fail?new Response('',{status:503}):Response.json({contractVersion:'1.0.0',status:'ready'})}
 assert.equal(u.hostname,'hyper.example');assert.equal(o.headers.Authorization,'Bearer hyper-secret');
 return Response.json({contractVersion:'1.0.0',reviewRequired:true,executable:false,specification:{pages:[{path:'index.html',title:'Home',sections:[{kind:'hero',title:'Welcome'}]},{path:'about.html',title:'About',sections:[{kind:'hero',title:'About us'}]}]}})
 };
 async function start(){const r=await createPersistentProduction({env,fetchImpl});servers.push(r.server);await new Promise(resolve=>r.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+r.server.address().port;return {r,call:(path,method='GET',token='alice',body)=>fetch(base+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})}}
 return {start,calls};
}
const input={name:'Demo',prompt:'Create a two page website'};
test('full generation and ZIP retrieval',async t=>{const {start,calls}=await fixture(t);const {call}=await start();const response=await call('/projects','POST','alice',input);assert.equal(response.status,201);const x=await response.json();assert.equal(x.job.status,'completed');assert.equal(x.publicationAuthorized,false);assert.ok(calls.includes('future.example'));assert.ok(calls.includes('hyper.example'));const zip=await call('/projects/'+x.job.id+'/download');assert.equal(zip.status,200);const b=Buffer.from(await zip.arrayBuffer());assert.equal(b.readUInt32LE(0),0x04034b50);assert.ok(b.includes(Buffer.from('about.html')))});
test('cross-user download denied',async t=>{const {start}=await fixture(t);const {call}=await start();const x=await (await call('/projects','POST','alice',input)).json();assert.equal((await call('/projects/'+x.job.id+'/download','GET','bob')).status,404)});
test('invalid identity blocks cores',async t=>{const {start,calls}=await fixture(t);const {call}=await start();assert.equal((await call('/projects','POST','unknown',input)).status,401);assert.deepEqual(calls,['auth.example'])});
test('core failure recorded without publication',async t=>{const {start,calls}=await fixture(t,{fail:true});const {call}=await start();assert.equal((await call('/projects','POST','alice',input)).status,500);const history=await (await call('/projects')).json();assert.equal(history[0].status,'failed');assert.ok(!calls.includes('hyper.example'))});

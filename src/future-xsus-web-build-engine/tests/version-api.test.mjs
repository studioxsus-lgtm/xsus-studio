import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPersistentGateway} from '../persistent-gateway.mjs';
import {createVersionStore} from '../version-store.mjs';
const id='11111111-1111-4111-8111-111111111111';
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'xsus-api-'));
 const store=createVersionStore({directory,verifyIdentity:async token=>token==='a'?{id:'a'}:null});
 const own=token=>{if(token!=='a')throw Error('Unauthorized')};
 const runtime={generate(){},get(){},list(){},download(){},listVersions(token,id){own(token);return store.list(token,id)},getVersion(token,id,r){own(token);return store.get(token,id,r)},saveVersion(token,id,f,r){own(token);return store.save(token,id,f,r)},restoreVersion(token,id,r,e){own(token);return store.restore(token,id,r,e)}};
 const {server}=createPersistentGateway({runtime});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true})});
 return (suffix='',body,token='a')=>fetch('http://127.0.0.1:'+server.address().port+'/projects/'+id+'/versions'+suffix,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
}
const input={expectedRevision:0,files:{'index.html':'home'}};
test('list empty history',async t=>{const call=await setup(t);assert.equal((await (await call()).json()).revision,0)});
test('save and retrieve version',async t=>{const call=await setup(t);assert.equal((await call('',input)).status,201);assert.deepEqual((await (await call('/1')).json()).files,input.files)});
test('restore creates new revision',async t=>{const call=await setup(t);await call('',input);await call('',{expectedRevision:1,files:{'index.html':'new'}});assert.equal((await call('/1/restore',{expectedRevision:2})).status,201);assert.deepEqual((await (await call('/3')).json()).files,input.files)});
test('stale revision returns conflict',async t=>{const call=await setup(t);await call('',input);assert.equal((await call('',input)).status,409)});
test('unauthorized history denied',async t=>{const call=await setup(t);assert.equal((await call('',undefined,'b')).status,401)});
test('invalid revision rejected',async t=>{const call=await setup(t);assert.equal((await call('',{...input,expectedRevision:-1})).status,400)});
test('missing version returns not found',async t=>{const call=await setup(t);assert.equal((await call('/1')).status,404)});
test('unsafe file rejected',async t=>{const call=await setup(t);assert.equal((await call('',{...input,files:{...input.files,'../bad.js':''}})).status,400)});

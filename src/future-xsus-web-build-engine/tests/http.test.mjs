import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createResourceServer} from '../http.mjs';
async function fixture(t){
 const server=createResourceServer({name:'items',fields:{name:'string'}},{verifyIdentity:async token=>['a','b'].includes(token)?{id:token}:null,maxBodyBytes:128});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections()}));
 const call=(path='',method='GET',token='a',body)=>fetch('http://127.0.0.1:'+server.address().port+'/items'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return call;
}
test('HTTP CRUD lifecycle',async t=>{const call=await fixture(t);const created=await call('','POST','a',{name:'First'});assert.equal(created.status,201);const x=await created.json();assert.equal((await (await call('/'+x.id)).json()).name,'First');assert.equal((await (await call('/'+x.id,'PATCH','a',{name:'Next'})).json()).name,'Next');assert.equal((await call('/'+x.id,'DELETE')).status,200);assert.equal((await call('/'+x.id)).status,404)});
test('missing token',async t=>assert.equal((await (await fixture(t))('','GET',null)).status,401));
test('invalid token',async t=>assert.equal((await (await fixture(t))('','GET','bad')).status,401));
test('cross-user isolation',async t=>{const call=await fixture(t);const x=await (await call('','POST','a',{name:'Private'})).json();assert.equal((await call('/'+x.id,'GET','b')).status,404);assert.deepEqual(await (await call('','GET','b')).json(),[])});
test('invalid field',async t=>assert.equal((await (await fixture(t))('','POST','a',{name:42})).status,400));
test('unknown route',async t=>assert.equal((await (await fixture(t))('/unknown')).status,404));
test('unsupported method',async t=>assert.equal((await (await fixture(t))('','PUT')).status,405));
test('body limit',async t=>assert.equal((await (await fixture(t))('','POST','a',{name:'x'.repeat(200)})).status,413));
test('no cache',async t=>assert.equal((await (await fixture(t))()).headers.get('cache-control'),'no-store'));

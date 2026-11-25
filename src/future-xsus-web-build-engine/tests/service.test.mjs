import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFullStackService} from '../service.mjs';
const resources=[{name:'products',fields:{name:'string'}},{name:'orders',fields:{paid:'boolean'}}];
const verifyIdentity=async t=>['a','b'].includes(t)?{id:t==='a'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222'}:null;
async function run(fn,options={}){const s=createFullStackService({resources,verifyIdentity,...options});await new Promise(r=>s.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+s.address().port;const request=(path,method='GET',body,token='a')=>fetch(url+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});try{await fn(request)}finally{await new Promise(r=>s.close(r))}}
test('two independent resources',()=>run(async r=>{assert.equal((await r('/products','POST',{name:'X'})).status,201);assert.deepEqual(await (await r('/orders')).json(),[])}));
test('owner isolation',()=>run(async r=>{await r('/products','POST',{name:'X'});assert.deepEqual(await (await r('/products','GET',undefined,'b')).json(),[])}));
test('invalid token',()=>run(async r=>assert.equal((await r('/products','GET',undefined,'bad')).status,401)));
test('unknown resource',()=>run(async r=>assert.equal((await r('/unknown')).status,404)));
test('invalid field',()=>run(async r=>assert.equal((await r('/orders','POST',{paid:'yes'})).status,400)));
test('method restrictions',()=>run(async r=>assert.equal((await r('/products','DELETE')).status,405)));
test('database adapter receives owner scope',()=>{const calls=[];return run(async r=>{assert.equal((await r('/products')).status,200);assert.match(calls[0][0],/WHERE owner_id = \$1/);assert.equal(calls[0][1][0],'11111111-1111-4111-8111-111111111111')},{query:async(...args)=>{calls.push(args);return {rows:[]}}})});
test('duplicate resources rejected',()=>assert.throws(()=>createFullStackService({resources:[resources[0],resources[0]],verifyIdentity})));
test('missing verifier rejected',()=>assert.throws(()=>createFullStackService({resources})));
test('invalid database adapter rejected',()=>assert.throws(()=>createFullStackService({resources,verifyIdentity,query:'invalid'})));

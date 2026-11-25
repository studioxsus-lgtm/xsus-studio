import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDatabaseRuntime} from '../database.mjs';
const owner='12345678-1234-1234-1234-123456789abc',id='22345678-1234-1234-1234-123456789abc';
function fixture(rows=[{id,name:'X'}]){const calls=[];const runtime=createDatabaseRuntime({name:'items',fields:{name:'string'}},{verifyIdentity:async t=>t==='ok'?{id:owner}:null,query:async(sql,args)=>{calls.push({sql,args});return {rows}}});return {runtime,calls}}
test('insert parameterizes values',async()=>{const {runtime,calls}=fixture();const value="' OR 1=1 --";await runtime.create('ok',{name:value});assert.equal(calls[0].args[2],value);assert.ok(!calls[0].sql.includes(value));assert.equal(calls[0].args[1],owner)});
for(const [method,args] of [['list',[]],['get',[id]],['update',[id,{name:'Y'}]],['remove',[id]]])test(method+' scopes owner',async()=>{const {runtime,calls}=fixture();await runtime[method]('ok',...args);assert.match(calls[0].sql,/WHERE owner_id = \$1/);assert.equal(calls[0].args[0],owner)});
test('unauthorized never queries',async()=>{const {runtime,calls}=fixture();await assert.rejects(runtime.list('bad'));assert.equal(calls.length,0)});
test('missing record',async()=>assert.rejects(fixture([]).runtime.get('ok',id),/Not found/));
test('rejects owner injection',async()=>{const {runtime,calls}=fixture();await assert.rejects(runtime.update('ok',id,{owner_id:owner}));assert.equal(calls.length,0)});
test('rejects invalid type',async()=>assert.rejects(fixture().runtime.create('ok',{name:42})));
test('rejects missing fields',async()=>assert.rejects(fixture().runtime.create('ok',{})));
test('requires adapters',()=>assert.throws(()=>createDatabaseRuntime({name:'items',fields:{name:'string'}})));

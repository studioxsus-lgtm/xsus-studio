import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApiClient,filterRecords} from '../client.mjs';
const id='12345678-1234-1234-1234-123456789abc';
function fixture(){const calls=[];const client=createApiClient({resource:'items',getToken:async()=>'token',fetchImpl:async(url,options)=>{calls.push({url,...options});return {ok:true,json:async()=>[]}}});return {client,calls}}
for(const [method,args,http,path] of [['list',[],'GET','/items'],['get',[id],'GET','/items/'+id],['create',[{name:'X'}],'POST','/items'],['update',[id,{name:'X'}],'PATCH','/items/'+id],['remove',[id],'DELETE','/items/'+id]])test(method,async()=>{const {client,calls}=fixture();await client[method](...args);assert.equal(calls[0].method,http);assert.equal(calls[0].url,path);assert.equal(calls[0].headers.Authorization,'Bearer token');assert.equal(calls[0].redirect,'error')});
test('rejects unsafe id',async()=>assert.rejects(fixture().client.get('../x')));
test('rejects unsafe resource',()=>assert.throws(()=>createApiClient({resource:'../x',getToken:()=>''})));
test('rejects missing token',async()=>assert.rejects(createApiClient({resource:'items',getToken:()=>null}).list()));
test('API errors',async()=>assert.rejects(createApiClient({resource:'items',getToken:()=>'x',fetchImpl:async()=>({ok:false,status:403})}).list(),/403/));
test('case insensitive filter',()=>assert.deepEqual(filterRecords([{name:'Alpha'},{name:'Beta'}],'ALP',['name']),[{name:'Alpha'}]));
test('empty filter',()=>assert.equal(filterRecords([{name:'A'}],' ',['name']).length,1));
test('numeric filter',()=>assert.equal(filterRecords([{price:123}],'23',['price']).length,1));

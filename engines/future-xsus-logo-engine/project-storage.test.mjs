import test from 'node:test';import assert from 'node:assert/strict';import {createProjectStorage} from './project-storage.mjs';
const id='12345678-1234-1234-1234-123456789abc';
function fixture(data=null,error=null,user=id){const calls=[];const q={};for(const method of ['select','eq','order','limit','insert','update','delete'])q[method]=(...args)=>{calls.push([method,...args]);return q};q.maybeSingle=q.single=async()=>({data,error});q.then=(resolve,reject)=>Promise.resolve({data,error}).then(resolve,reject);return {calls,storage:createProjectStorage({auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},from:name=>{calls.push(['from',name]);return q}})}}
test('list scopes owner',async()=>{const f=fixture([]);assert.deepEqual(await f.storage.list(),[]);assert.ok(f.calls.some(c=>c[0]==='eq'&&c[1]==='owner_id'&&c[2]===id))});
test('unauthenticated list rejected',async()=>{const f=fixture([],null,null);await assert.rejects(f.storage.list(),/Authentication/);assert.equal(f.calls.length,0)});
test('invalid project id rejected',async()=>{await assert.rejects(fixture().storage.open('invalid'),/Invalid project ID/)});
test('invalid revision rejected',async()=>{await assert.rejects(fixture().storage.remove(id,0),/Invalid revision/)});
test('delete requires matching revision',async()=>{const f=fixture({id});await f.storage.remove(id,3);assert.ok(f.calls.some(c=>c[0]==='eq'&&c[1]==='revision'&&c[2]===3))});
test('missing row rejects conflict',async()=>{await assert.rejects(fixture().storage.remove(id,3),/revision conflict/)});
test('database errors propagated safely',async()=>{await assert.rejects(fixture(null,{message:'private'}).storage.list(),/Project storage request failed/)});
test('invalid name rejected',async()=>{await assert.rejects(fixture().storage.create(' ',{}),/Invalid name/)});

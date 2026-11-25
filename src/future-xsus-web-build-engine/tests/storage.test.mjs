import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStorage} from '../storage.mjs';
const input={name:'Demo',type:'business'};
async function fixture(t){const dir=await mkdtemp(join(tmpdir(),'xsus-web-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {dir,s:createStorage(dir)}}
test('missing project',async t=>{const {s}=await fixture(t);assert.equal(await s.read('a'),null)});
test('persists across instances',async t=>{const {s,dir}=await fixture(t);const record=await s.save('a',input);assert.deepEqual(await createStorage(dir).read('a'),JSON.parse(JSON.stringify(record)))});
test('updates revision',async t=>{const {s}=await fixture(t);await s.save('a',input);assert.equal((await s.save('a',input,{},1)).revision,2)});
test('rejects stale writes',async t=>{const {s}=await fixture(t);await s.save('a',input);await assert.rejects(s.save('a',input),/Revision conflict/)});
test('rejects traversal',async t=>{const {s}=await fixture(t);await assert.rejects(s.read('../a'))});
test('isolates records',async t=>{const {s}=await fixture(t);await s.save('a',input);await s.save('b',{...input,name:'Other'});assert.equal((await s.read('a')).plan.name,'Demo')});
test('concurrent writes only one wins',async t=>{const {s}=await fixture(t);const results=await Promise.allSettled([s.save('a',input),s.save('a',input)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1)});
test('invalid revision',async t=>{const {s}=await fixture(t);await assert.rejects(s.save('a',input,{},-1))});

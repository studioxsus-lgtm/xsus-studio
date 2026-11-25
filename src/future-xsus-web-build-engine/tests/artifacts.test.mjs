import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createArtifactStorage} from '../artifacts.mjs';
import {generateUnifiedProject} from '../pipeline.mjs';
const draft=()=>generateUnifiedProject({name:'Demo',pages:[{path:'index.html',title:'Home',sections:[{kind:'hero',title:'Welcome'}]}]});
async function fixture(t,opts={}){const directory=await mkdtemp(join(tmpdir(),'xsus-artifact-'));t.after(()=>rm(directory,{recursive:true,force:true}));const config={directory,verifyIdentity:async token=>token?{id:token}:null,...opts};return {store:createArtifactStorage(config),config,directory}}
test('save ZIP',async t=>{const {store}=await fixture(t);const a=await store.save('a',draft());assert.ok(a.bytes>0);assert.equal(a.publicationAuthorized,false)});
test('read ZIP',async t=>{const {store}=await fixture(t);const a=await store.save('a',draft());const r=await store.read('a',a.id);assert.equal(r.archive.readUInt32LE(0),0x04034b50);assert.equal(r.sha256,a.sha256)});
test('restart persistence',async t=>{const {store,config}=await fixture(t);const a=await store.save('a',draft());assert.equal((await createArtifactStorage(config).read('a',a.id)).bytes,a.bytes)});
test('owner isolation',async t=>{const {store}=await fixture(t);const a=await store.save('a',draft());await assert.rejects(store.read('b',a.id),/Not found/);assert.equal(await store.remove('b',a.id),false)});
test('authentication required',async t=>{const {store}=await fixture(t);await assert.rejects(store.save(null,draft()),/Unauthorized/)});
test('traversal rejected',async t=>{const {store}=await fixture(t);await assert.rejects(store.read('a','../secret'))});
test('size limit',async t=>{const {store}=await fixture(t,{maxBytes:1});await assert.rejects(store.save('a',draft()),/too large/)});
test('remove',async t=>{const {store}=await fixture(t);const a=await store.save('a',draft());assert.equal(await store.remove('a',a.id),true);await assert.rejects(store.read('a',a.id),/Not found/)});
test('tampered artifact rejected',async t=>{const {store,directory}=await fixture(t);const a=await store.save('a',draft());const p=join(directory,createHash('sha256').update('a').digest('hex'),a.id+'.json');const r=JSON.parse(await readFile(p,'utf8'));r.sha256='bad';await writeFile(p,JSON.stringify(r));await assert.rejects(store.read('a',a.id),/integrity/)});
test('non-draft rejected',async t=>{const {store}=await fixture(t);await assert.rejects(store.save('a',{...draft(),status:'published'}))});
test('invalid config',()=>assert.throws(()=>createArtifactStorage({directory:''})));

test('physical quota rejects oversized record',async t=>{const {store}=await fixture(t,{maxOwnerBytes:1,maxTotalBytes:1});await assert.rejects(store.save('a',draft()),/Quota exceeded/)});
test('quota survives restart',async t=>{const {store,config}=await fixture(t);const a=await store.save('a',draft());const limit=Math.ceil(a.bytes*4/3)+512;const restarted=createArtifactStorage({...config,maxOwnerBytes:limit,maxTotalBytes:limit});await assert.rejects(restarted.save('a',draft()),/Quota exceeded/);await restarted.remove('a',a.id);assert.ok((await restarted.save('a',draft())).id)});
test('concurrent saves respect quota',async t=>{const {store,config}=await fixture(t);const a=await store.save('a',draft());await store.remove('a',a.id);const limit=Math.ceil(a.bytes*4/3)+512;const bounded=createArtifactStorage({...config,maxOwnerBytes:limit,maxTotalBytes:limit});const results=await Promise.allSettled([bounded.save('a',draft()),bounded.save('b',draft())]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1)});

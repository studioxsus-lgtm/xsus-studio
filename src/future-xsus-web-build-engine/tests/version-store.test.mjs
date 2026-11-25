import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createVersionStore} from '../version-store.mjs';
async function setup(t,options={}){const directory=await mkdtemp(join(tmpdir(),'xsus-version-'));t.after(()=>rm(directory,{recursive:true,force:true}));const config={directory,verifyIdentity:async token=>token?{id:token}:null,...options};return {directory,store:createVersionStore(config),config}}
const files={'index.html':'home'};
test('save and reopen',async t=>{const {store,config}=await setup(t);await store.save('a','p',files,0);assert.deepEqual((await createVersionStore(config).get('a','p',1)).files,files)});
test('owner isolation',async t=>{const {store}=await setup(t);await store.save('a','p',files,0);assert.equal((await store.list('b','p')).revision,0);await assert.rejects(store.get('b','p',1))});
test('restore creates revision',async t=>{const {store}=await setup(t);await store.save('a','p',files,0);await store.save('a','p',{'index.html':'new'},1);assert.equal((await store.restore('a','p',1,2)).revision,3);assert.deepEqual((await store.get('a','p',3)).files,files)});
test('stale revision',async t=>{const {store}=await setup(t);await store.save('a','p',files,0);await assert.rejects(store.save('a','p',files,0),/Revision conflict/)});
test('bounded retention',async t=>{const {store}=await setup(t,{maxVersions:1});await store.save('a','p',files,0);await store.save('a','p',files,1);assert.equal((await store.list('a','p')).versions.length,1);await assert.rejects(store.get('a','p',1))});
test('unauthorized',async t=>{const {store}=await setup(t);await assert.rejects(store.list(null,'p'),/Unauthorized/)});
test('unsafe project id',async t=>{const {store}=await setup(t);await assert.rejects(store.save('a','../p',files,0))});
test('tampered source detected',async t=>{const {store,directory}=await setup(t);await store.save('a','p',files,0);const [owner]=await readdir(directory);const path=join(directory,owner,'p.json');const d=JSON.parse(await readFile(path,'utf8'));d.versions[0].files['index.html']='tampered';await writeFile(path,JSON.stringify(d));await assert.rejects(store.get('a','p',1),/Integrity failure/)});
test('concurrent writes cannot both succeed',async t=>{const {store}=await setup(t);const results=await Promise.allSettled([store.save('a','p',files,0),store.save('a','p',files,0)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1)});
test('publication remains disabled',async t=>{const {store}=await setup(t);assert.equal((await store.save('a','p',files,0)).publicationAuthorized,false)});

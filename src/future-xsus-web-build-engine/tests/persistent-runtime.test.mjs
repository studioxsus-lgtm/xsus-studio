import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPersistentRuntime} from '../persistent-runtime.mjs';
import {generateUnifiedProject} from '../pipeline.mjs';
const input={name:'Demo',prompt:'Create a site'};
const generate=async()=>({status:'draft',publicationAuthorized:false,result:{project:generateUnifiedProject({name:'Demo',pages:[{path:'index.html',title:'Home',sections:[{kind:'hero',title:'Welcome'}]}]})}});
async function fixture(t,opts={}){const directory=await mkdtemp(join(tmpdir(),'xsus-runtime-'));t.after(()=>rm(directory,{recursive:true,force:true}));const config={directory,generate,verifyIdentity:async token=>token?{id:token}:null,...opts};return {config,r:await createPersistentRuntime(config)}}
test('generation completes',async t=>{const {r}=await fixture(t);const x=await r.generate('a',input);assert.equal(x.job.status,'completed');assert.equal(x.job.artifactId,x.artifact.id)});
test('ZIP retrieval',async t=>{const {r}=await fixture(t);const x=await r.generate('a',input);assert.equal((await r.download('a',x.job.id)).archive.readUInt32LE(0),0x04034b50)});
test('restart retrieval',async t=>{const {r,config}=await fixture(t);const x=await r.generate('a',input);const restarted=await createPersistentRuntime(config);assert.equal((await restarted.download('a',x.job.id)).sha256,x.artifact.sha256)});
test('history persists',async t=>{const {r,config}=await fixture(t);await r.generate('a',input);assert.equal((await (await createPersistentRuntime(config)).list('a')).length,1)});
test('owner isolation',async t=>{const {r}=await fixture(t);const x=await r.generate('a',input);await assert.rejects(r.download('b',x.job.id),/Not found/);assert.deepEqual(await r.list('b'),[])});
test('unauthorized',async t=>{const {r}=await fixture(t);await assert.rejects(r.generate(null,input),/Unauthorized/)});
test('failed generation recorded',async t=>{const {r}=await fixture(t,{generate:async()=>{throw Error('Failure')}});await assert.rejects(r.generate('a',input));assert.equal((await r.list('a'))[0].status,'failed');assert.equal(r.diagnostics().active,0)});
test('non-draft rejected',async t=>{const {r}=await fixture(t,{generate:async()=>({status:'published'})});await assert.rejects(r.generate('a',input),/Draft unavailable/)});
test('invalid input rejected',async t=>{const {r}=await fixture(t);await assert.rejects(r.generate('a',{...input,prompt:''}));assert.equal((await r.list('a')).length,0)});
test('publication blocked',async t=>{const {r}=await fixture(t);assert.equal((await r.generate('a',input)).publicationAuthorized,false)});
test('failed job cannot download',async t=>{const {r}=await fixture(t,{generate:async()=>{throw Error('Failure')}});await assert.rejects(r.generate('a',input));const [j]=await r.list('a');await assert.rejects(r.download('a',j.id),/unavailable/)});
test('capacity bounded',async t=>{let release,entered;const ready=new Promise(r=>entered=r);const {r}=await fixture(t,{maxConcurrent:1,generate:async()=>{entered();await new Promise(r=>release=r);return generate()}});const p=r.generate('a',input);await ready;await assert.rejects(r.generate('a',input),/capacity/);release();await p});

test('generation deadline records failure and retains pending capacity',async t=>{let release,signal;const {r}=await fixture(t,{maxConcurrent:1,generationTimeoutMs:10,generate:(_,options)=>{signal=options.signal;return new Promise(resolve=>release=resolve)}});await assert.rejects(r.generate('a',input),/Generation timeout/);assert.equal(signal.aborted,true);assert.equal((await r.list('a'))[0].status,'failed');assert.equal(r.diagnostics().pending,1);await assert.rejects(r.generate('a',input),/capacity/);release(await generate());await new Promise(resolve=>setImmediate(resolve));assert.equal(r.diagnostics().pending,0);assert.equal((await r.list('a'))[0].artifactId,null)});
test('invalid generation timeout rejected',async t=>{await assert.rejects(fixture(t,{generationTimeoutMs:0}),/Invalid generation timeout/)});

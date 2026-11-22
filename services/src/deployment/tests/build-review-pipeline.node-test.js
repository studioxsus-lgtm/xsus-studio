import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewSavedProjectBuild} from '../build-review-pipeline.js';
const projectId='11111111-1111-4111-8111-111111111111';
const ownerId='22222222-2222-4222-8222-222222222222';
const files={'index.html':'<html><head></head><body>ok</body></html>','styles.css':'body{}','app.js':'console.log(1)'};
const args={projectId,ownerId};
function deps(){return {findOwnedProject:async()=>({id:projectId,ownerId}),buildFromSavedProject:async()=>files};}
test('valid owner and server builder return review-only manifest',async()=>{
 const r=await reviewSavedProjectBuild(args,deps());
 assert.equal(r.status,'ready-for-review');assert.equal(r.deployed,false);
 assert.equal(r.manifest.deployable,false);assert.equal(r.manifest.files.length,3);
});
test('invalid IDs reject before dependencies run',async()=>{
 let called=false;
 const r=await reviewSavedProjectBuild({...args,projectId:'project_1'},{
  findOwnedProject:async()=>{called=true;return null;},buildFromSavedProject:async()=>{called=true;return files;}
 });
 assert.equal(r.status,'denied');assert.equal(called,false);
});
test('denies missing trusted dependencies',async()=>{
 const r=await reviewSavedProjectBuild(args,{});
 assert.equal(r.status,'denied');
});
test('ownership mismatch prevents builder execution',async()=>{
 let built=false;
 const r=await reviewSavedProjectBuild(args,{
  findOwnedProject:async()=>({id:projectId,ownerId:'33333333-3333-4333-8333-333333333333'}),
  buildFromSavedProject:async()=>{built=true;return files;}
 });
 assert.equal(r.status,'denied');assert.equal(built,false);
});
test('rejects malformed server artifacts',async()=>{
 const r=await reviewSavedProjectBuild(args,{...deps(),buildFromSavedProject:async()=>({...files,'index.html':'bad'})});
 assert.equal(r.status,'denied');assert.equal(r.deployed,false);
});
test('rejects builder failure without leaking its message',async()=>{
 const r=await reviewSavedProjectBuild(args,{...deps(),buildFromSavedProject:async()=>{throw Error('private snapshot text');}});
 assert.equal(r.status,'denied');assert.equal(JSON.stringify(r).includes('private'),false);
});

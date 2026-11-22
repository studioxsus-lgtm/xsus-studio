import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewBuildWithRevisionGuard} from '../revision-guarded-build-review.js';
const projectId='11111111-1111-4111-8111-111111111111';
const ownerId='22222222-2222-4222-8222-222222222222';
const args={projectId,ownerId};
const files={'index.html':'<html><head></head><body>ok</body></html>',
 'styles.css':'body{}','app.js':'console.log(1)'};
const digestA='a'.repeat(64),digestB='b'.repeat(64);
function deps(revisions=[digestA,digestA]) {
 let index=0;
 return {readOwnedRevision:async()=>revisions[index++],
  findOwnedProject:async()=>({id:projectId,ownerId}),
  buildFromSavedProject:async()=>files};
}
test('stable persisted revision returns review-only manifest',async()=>{
 const result=await reviewBuildWithRevisionGuard(args,deps());
 assert.equal(result.status,'ready-for-review');
 assert.equal(result.reason,'STATIC_REVIEW_REVISION_STABLE');
 assert.equal(result.deployed,false);
 assert.equal(result.manifest.deployable,false);
});
test('changed persisted snapshot during build rejects review',async()=>{
 const result=await reviewBuildWithRevisionGuard(args,deps([digestA,digestB]));
 assert.equal(result.status,'denied');
 assert.equal(result.reason,'PROJECT_REVISION_CHANGED');
 assert.equal(result.manifest,null);
});
test('missing revision reader fails before build',async()=>{
 let called=false;
 const result=await reviewBuildWithRevisionGuard(args,{
  findOwnedProject:async()=>{called=true;return {id:projectId,ownerId};},
  buildFromSavedProject:async()=>{called=true;return files;}
 });
 assert.equal(result.reason,'REVISION_READER_UNAVAILABLE');
 assert.equal(called,false);
});
test('invalid identity fails before revision lookup',async()=>{
 let called=false;
 const result=await reviewBuildWithRevisionGuard({...args,projectId:'project_1'},{
  ...deps(),readOwnedRevision:async()=>{called=true;return digestA;}
 });
 assert.equal(result.reason,'INVALID_PROJECT_IDENTITY');
 assert.equal(called,false);
});
test('missing initial revision rejects before builder execution',async()=>{
 let called=false;
 const result=await reviewBuildWithRevisionGuard(args,{
  ...deps(),readOwnedRevision:async()=>null,
  buildFromSavedProject:async()=>{called=true;return files;}
 });
 assert.equal(result.reason,'UNVERIFIED_PROJECT_REVISION');
 assert.equal(called,false);
});
test('failed owner check rejects and skips second revision read',async()=>{
 let reads=0;
 const result=await reviewBuildWithRevisionGuard(args,{
  ...deps(),readOwnedRevision:async()=>{reads++;return digestA;},
  findOwnedProject:async()=>null
 });
 assert.equal(result.status,'denied');
 assert.equal(reads,1);
});
test('missing final revision rejects without exposing digest',async()=>{
 const result=await reviewBuildWithRevisionGuard(args,deps([digestA,null]));
 assert.equal(result.status,'denied');
 assert.equal(result.reason,'UNVERIFIED_PROJECT_REVISION');
 assert.equal(JSON.stringify(result).includes(digestA),false);
});
test('revision reader exceptions fail closed without exposing private data',async()=>{
 const result=await reviewBuildWithRevisionGuard(args,{
  ...deps(),readOwnedRevision:async()=>{throw Error('private snapshot');}
 });
 assert.equal(result.reason,'REVISION_REVIEW_UNAVAILABLE');
 assert.equal(JSON.stringify(result).includes('private'),false);
});

test('owner reassigned after final revision read fails closed',async()=>{
 let checks=0;
 const result=await reviewBuildWithRevisionGuard(args,{
  ...deps(),
  findOwnedProject:async()=>++checks===3
   ? {id:projectId,ownerId:'33333333-3333-4333-8333-333333333333'}
   : {id:projectId,ownerId}
 });
 assert.equal(checks,3);
 assert.equal(result.status,'denied');
 assert.equal(result.reason,'PROJECT_OWNERSHIP_CHANGED');
 assert.equal(result.deployed,false);
});
test('missing final ownership check dependency fails closed',async()=>{
 const result=await reviewBuildWithRevisionGuard(args,{
  ...deps(),findOwnedProject:async()=>({id:projectId,ownerId})
 });
 assert.equal(result.status,'ready-for-review');
 assert.equal(result.deployed,false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthenticatedProjectReviewer} from '../authenticated-project-review.js';
const projectId='11111111-1111-4111-8111-111111111111';
const ownerId='22222222-2222-4222-8222-222222222222';
const make=(overrides={})=>{
 const calls=[];
 const deps={
  verifyAccessToken:async token=>{calls.push(['auth',token]);return {sub:ownerId};},
  projectStore:{findOwnedProject:async args=>{calls.push(['owner',args]);return {id:projectId,ownerId};}},
  revisionReader:{readOwnedRevision:async args=>{calls.push(['revision',args]);return 'a'.repeat(64);}},
  buildFromSavedProject:async args=>{calls.push(['build',args]);return null;},
  ...overrides
 };
 return {reviewer:createAuthenticatedProjectReviewer(deps),calls};
};
test('rejects absent trusted dependencies at construction',()=>{
 assert.throws(()=>createAuthenticatedProjectReviewer({}),TypeError);
});
test('rejects invalid token and project ID without consulting dependencies',async()=>{
 const {reviewer,calls}=make();
 assert.equal((await reviewer.review({accessToken:'short',projectId})).reason,'INVALID_REVIEW_REQUEST');
 assert.equal((await reviewer.review({accessToken:'x'.repeat(20),projectId:'invalid'})).reason,'INVALID_REVIEW_REQUEST');
 assert.equal(calls.length,0);
});
test('rejects unverified identity before reading saved project',async()=>{
 const {reviewer,calls}=make({verifyAccessToken:async()=>({sub:'attacker'})});
 assert.equal((await reviewer.review({accessToken:'x'.repeat(20),projectId})).reason,'UNAUTHENTICATED');
 assert.equal(calls.length,0);
});
test('uses only verified subject, ignoring caller-supplied ownerId',async()=>{
 const {reviewer,calls}=make();
 const result=await reviewer.review({accessToken:'x'.repeat(20),projectId,ownerId:'33333333-3333-4333-8333-333333333333'});
 assert.equal(result.deployed,false);
 assert.ok(calls.some(([name])=>name==='owner'));
 for(const [name,args] of calls) if(name!=='auth') assert.equal(args.ownerId,ownerId);
});
test('authentication failure denies and does not access project',async()=>{
 const {reviewer,calls}=make({verifyAccessToken:async()=>{throw new Error('bad signature');}});
 assert.equal((await reviewer.review({accessToken:'x'.repeat(20),projectId})).reason,'REVIEW_UNAVAILABLE');
 assert.equal(calls.length,0);
});
test('owner mismatch prevents build',async()=>{
 const {reviewer,calls}=make({projectStore:{findOwnedProject:async()=>null}});
 assert.equal((await reviewer.review({accessToken:'x'.repeat(20),projectId})).reason,'PROJECT_OWNERSHIP_NOT_VERIFIED');
 assert.equal(calls.some(([name])=>name==='build'),false);
});

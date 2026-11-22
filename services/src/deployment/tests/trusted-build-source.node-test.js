import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectTrustedBuildSource} from '../trusted-build-source.js';
const valid={projectId:'11111111-1111-4111-8111-111111111111',ownerId:'22222222-2222-4222-8222-222222222222',origin:'server-generated',authorizationVerified:true,projectRevisionVerified:true,builderVersion:'1.0.0',sourceDigest:'a'.repeat(64)};
test('records structurally complete server provenance without deployment approval',()=>{
 const result=inspectTrustedBuildSource(valid);
 assert.equal(result.eligible,true);
 assert.equal(result.deployable,false);
});
test('rejects browser snapshot and client-generated provenance',()=>{
 for(const origin of ['browser-snapshot','client-generated',undefined]){
  const result=inspectTrustedBuildSource({...valid,origin});
  assert.equal(result.eligible,false);
  assert.equal(result.deployable,false);
 }
});
test('rejects missing ownership or revision verification',()=>{
 for(const key of ['authorizationVerified','projectRevisionVerified']){
  assert.equal(inspectTrustedBuildSource({...valid,[key]:false}).eligible,false);
 }
});
test('rejects invalid UUID, builder version, and digest',()=>{
 for(const patch of [{projectId:'project_1'},{ownerId:'not-a-uuid'},{builderVersion:'unknown'},{sourceDigest:'not-a-hash'}])
  assert.equal(inspectTrustedBuildSource({...valid,...patch}).eligible,false);
});
test('rejects missing or malformed source',()=>{
 for(const value of [null,[],{},'string'])
  assert.equal(inspectTrustedBuildSource(value).eligible,false);
});
test('does not echo source metadata or allow mutation',()=>{
 const result=inspectTrustedBuildSource({...valid,secret:'private'});
 assert.equal(JSON.stringify(result).includes('private'),false);
 assert.throws(()=>{result.deployable=true;},TypeError);
});

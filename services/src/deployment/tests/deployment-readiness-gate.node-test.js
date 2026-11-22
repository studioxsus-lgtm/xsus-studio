import test from 'node:test';
import assert from 'node:assert/strict';
import {assessDeploymentReadiness} from '../deployment-readiness-gate.js';
const review={status:'ready-for-review',deployed:false,manifest:{deployable:false}};
const snapshotInspection={found:true,supported:true,deployable:false};
const provenance={eligible:true,deployable:false};
test('all static checks passing cannot enable production deployment',()=>{
 const result=assessDeploymentReadiness({review,snapshotInspection,provenance});
 assert.equal(result.readyForDeployment,false);
 assert.equal(result.deployed,false);
 assert.deepEqual(result.blockers,['PRODUCTION_DEPLOYMENT_NOT_ENABLED']);
});
test('missing checks fail closed',()=>{
 const result=assessDeploymentReadiness();
 assert.equal(result.readyForDeployment,false);
 assert.equal(result.blockers.length,4);
});
test('review approval or deployment claim is not accepted',()=>{
 for(const candidate of [{...review,deployed:true},{...review,manifest:{deployable:true}},
  {...review,status:'approved'}]){
  const result=assessDeploymentReadiness({review:candidate,snapshotInspection,provenance});
  assert.ok(result.blockers.includes('BUILD_REVIEW_NOT_VERIFIED'));
 }
});
test('missing saved project or unsupported snapshot blocks readiness',()=>{
 for(const candidate of [{...snapshotInspection,found:false},{...snapshotInspection,supported:false}]){
  const result=assessDeploymentReadiness({review,snapshotInspection:candidate,provenance});
  assert.ok(result.blockers.includes('SAVED_PROJECT_NOT_VERIFIED'));
 }
});
test('unverified provenance blocks readiness',()=>{
 for(const candidate of [{...provenance,eligible:false},{...provenance,deployable:true}]){
  const result=assessDeploymentReadiness({review,snapshotInspection,provenance:candidate});
  assert.ok(result.blockers.includes('SERVER_PROVENANCE_NOT_VERIFIED'));
 }
});
test('result cannot be mutated or contain source content',()=>{
 const result=assessDeploymentReadiness({review,snapshotInspection,provenance:{...provenance,secret:'private'}});
 assert.equal(JSON.stringify(result).includes('private'),false);
 assert.throws(()=>{result.readyForDeployment=true;},TypeError);
 assert.throws(()=>{result.blockers.push('bypass');},TypeError);
});

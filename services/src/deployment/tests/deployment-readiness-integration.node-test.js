import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewSavedProjectBuild} from '../build-review-pipeline.js';
import {inspectBuilderSnapshot} from '../builder-snapshot-inspection.js';
import {inspectTrustedBuildSource} from '../trusted-build-source.js';
import {assessDeploymentReadiness} from '../deployment-readiness-gate.js';
const projectId='11111111-1111-4111-8111-111111111111';
const ownerId='22222222-2222-4222-8222-222222222222';
const files={'index.html':'<html><head></head><body>ok</body></html>',
 'styles.css':'body{}','app.js':'console.log(1)'};
const snapshot={version:1,session:{messages:[],generatedHtml:'<html>private</html>'},reviews:[],boards:[]};
const provenance={projectId,ownerId,origin:'server-generated',
 authorizationVerified:true,projectRevisionVerified:true,builderVersion:'1.0.0',
 sourceDigest:'a'.repeat(64)};
const owned={findOwnedProject:async()=>({id:projectId,ownerId}),
 buildFromSavedProject:async()=>files};
async function run(deps=owned,saved=snapshot,source=provenance){
 const review=await reviewSavedProjectBuild({projectId,ownerId},deps);
 const shape=inspectBuilderSnapshot(saved);
 const snapshotInspection={found:true,supported:shape.supported,deployable:shape.deployable};
 return assessDeploymentReadiness({review,snapshotInspection,
  provenance:inspectTrustedBuildSource(source)});
}
test('all valid mocked components still cannot authorize production',async()=>{
 const result=await run();
 assert.equal(result.readyForDeployment,false);
 assert.equal(result.deployed,false);
 assert.deepEqual(result.blockers,['PRODUCTION_DEPLOYMENT_NOT_ENABLED']);
});
test('wrong project owner blocks review and readiness',async()=>{
 const result=await run({...owned,findOwnedProject:async()=>({id:projectId,ownerId:'33333333-3333-4333-8333-333333333333'})});
 assert.ok(result.blockers.includes('BUILD_REVIEW_NOT_VERIFIED'));
 assert.equal(result.readyForDeployment,false);
});
test('untrusted browser snapshot is not a trusted build artifact',async()=>{
 const result=await run({...owned,buildFromSavedProject:async()=>snapshot});
 assert.ok(result.blockers.includes('BUILD_REVIEW_NOT_VERIFIED'));
});
test('unsupported persisted snapshot blocks readiness',async()=>{
 const result=await run(owned,{version:99},provenance);
 assert.ok(result.blockers.includes('SAVED_PROJECT_NOT_VERIFIED'));
});
test('client-origin provenance blocks readiness',async()=>{
 const result=await run(owned,snapshot,{...provenance,origin:'browser-snapshot'});
 assert.ok(result.blockers.includes('SERVER_PROVENANCE_NOT_VERIFIED'));
});

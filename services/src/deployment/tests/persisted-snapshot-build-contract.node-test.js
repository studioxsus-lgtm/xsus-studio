import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPersistedBuildSnapshot} from '../persisted-snapshot-build-contract.js';
test('real XSUS planning snapshot is not a deployable application',()=>{
 const result=inspectPersistedBuildSnapshot({
  version:1,goal:'Example',steps:'Plan',boards:[],reviews:[],
  session:{},saveToken:'client-value'
 });
 assert.deepEqual(result,{buildable:false,reason:'NO_TRUSTED_BUILD_ARTIFACTS'});
});
test('browser-saved artifacts cannot claim trusted builder provenance',()=>{
 const result=inspectPersistedBuildSnapshot({
  buildArtifacts:{'index.html':'<html></html>','styles.css':'body{}','app.js':'alert(1)'}
 });
 assert.deepEqual(result,{buildable:false,reason:'SERVER_BUILDER_REQUIRED'});
});
test('invalid snapshots fail closed',()=>{
 for(const snapshot of [null,[],undefined,'text'])
  assert.equal(inspectPersistedBuildSnapshot(snapshot).buildable,false);
});

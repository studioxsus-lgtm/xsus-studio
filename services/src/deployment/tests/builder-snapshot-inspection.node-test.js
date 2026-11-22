import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectBuilderSnapshot} from '../builder-snapshot-inspection.js';
const snapshot={version:1,session:{messages:[],generatedHtml:'<html>private</html>'},reviews:[],boards:[],goal:'secret prompt'};
test('recognizes existing account snapshot shape without exposing content',()=>{
 const result=inspectBuilderSnapshot(snapshot);
 assert.equal(result.supported,true);
 assert.equal(result.hasGeneratedHtml,true);
 assert.equal(result.hasVerifiedBuildArtifacts,false);
 assert.equal(result.deployable,false);
 assert.equal(JSON.stringify(result).includes('private'),false);
 assert.equal(JSON.stringify(result).includes('secret'),false);
});
test('empty HTML does not imply a generated artifact',()=>{
 const result=inspectBuilderSnapshot({...snapshot,session:{messages:[],generatedHtml:''}});
 assert.equal(result.hasGeneratedHtml,false);
 assert.equal(result.deployable,false);
});
test('rejects malformed or unsupported snapshots',()=>{
 for(const item of [null,[],{}, {...snapshot,version:2},{...snapshot,reviews:null},
   {...snapshot,session:{messages:'not an array'}}]) {
  assert.equal(inspectBuilderSnapshot(item).supported,false);
  assert.equal(inspectBuilderSnapshot(item).deployable,false);
 }
});
test('cannot mutate inspection into an approval',()=>{
 const result=inspectBuilderSnapshot(snapshot);
 assert.throws(()=>{result.deployable=true;},TypeError);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectStableProjectRevision} from '../project-revision-contract.js';
const a='revision_aaaaaaaaaaaaaaaa',b='revision_bbbbbbbbbbbbbbbb';
test('identical trusted revision tokens are stable but not deployable',()=>{
 const result=inspectStableProjectRevision(a,a);
 assert.equal(result.stable,true);
 assert.equal(result.deployable,false);
 assert.equal(result.reason,'REVISION_UNCHANGED');
});
test('changed revision fails closed',()=>{
 const result=inspectStableProjectRevision(a,b);
 assert.equal(result.stable,false);
 assert.equal(result.reason,'PROJECT_REVISION_CHANGED');
});
test('missing or malformed revisions fail closed',()=>{
 for(const value of [undefined,null,'',{},'short','a b','x'.repeat(129)]){
  const result=inspectStableProjectRevision(a,value);
  assert.equal(result.stable,false);
  assert.equal(result.reason,'UNVERIFIED_PROJECT_REVISION');
 }
});
test('results are immutable and contain no revision token',()=>{
 const result=inspectStableProjectRevision(a,a);
 assert.equal(JSON.stringify(result).includes(a),false);
 assert.throws(()=>{result.stable=false;},TypeError);
});

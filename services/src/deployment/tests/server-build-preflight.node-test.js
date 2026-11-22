import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectServerBuild} from '../server-build-preflight.js';
const files={'index.html':'<!doctype html><html><head></head><body>OK</body></html>','styles.css':'body{}','app.js':'console.log(1)'};
test('accepts basic static structure but never authorizes deployment',()=>{
 const result=inspectServerBuild(files);
 assert.equal(result.ok,true);
 assert.equal(result.deployable,false);
 assert.equal(result.manifest.verifiedSource,false);
 assert.equal(result.manifest.files.length,3);
});
test('rejects invalid HTML structure',()=>{
 const result=inspectServerBuild({...files,'index.html':'<div>bad</div>'});
 assert.equal(result.ok,false);
 assert.ok(result.issues.includes('INVALID_HTML_STRUCTURE'));
 assert.equal(result.deployable,false);
});
test('rejects blank CSS or JavaScript',()=>{
 for(const name of ['styles.css','app.js']){
  const result=inspectServerBuild({...files,[name]:'  '});
  assert.equal(result.ok,false);
  assert.ok(result.issues.includes('EMPTY_ARTIFACT'));
 }
});
test('rejects oversized or missing artifact sets',()=>{
 for(const candidate of [{...files,'app.js':'a'.repeat(1024*1024+1)},{'index.html':files['index.html']}]) {
  const result=inspectServerBuild(candidate);
  assert.equal(result.ok,false);
  assert.equal(result.manifest,null);
  assert.equal(result.deployable,false);
 }
});
test('never includes source content in issues',()=>{
 const result=inspectServerBuild({...files,'index.html':'private-user-text'});
 assert.equal(JSON.stringify(result.issues).includes('private-user-text'),false);
 assert.throws(()=>{result.deployable=true;},TypeError);
});

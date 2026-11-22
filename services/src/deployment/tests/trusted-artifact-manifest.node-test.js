import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createTrustedArtifactManifest} from '../trusted-artifact-manifest.js';
const files={'index.html':'<html>ä</html>','styles.css':'body{}','app.js':'console.log(1)'};
test('creates deterministic UTF-8 digest manifest with no deployment approval',()=>{
 const a=createTrustedArtifactManifest(files),b=createTrustedArtifactManifest(files);
 assert.deepEqual(a,b);
 assert.equal(a.deployable,false);
 assert.equal(a.verifiedSource,false);
 assert.deepEqual(a.files.map(x=>x.name),['index.html','styles.css','app.js']);
 assert.equal(a.files[0].bytes,Buffer.byteLength(files['index.html'],'utf8'));
 assert.equal(a.files[0].sha256,createHash('sha256').update(files['index.html']).digest('hex'));
});
test('does not include user content in manifest',()=>{
 const result=createTrustedArtifactManifest(files);
 assert.equal(JSON.stringify(result).includes('console.log'),false);
 assert.equal(JSON.stringify(result).includes('<html>'),false);
});
test('rejects missing, extra, or non-string artifacts',()=>{
 for(const value of [null,{}, {...files,other:'x'},{...files,'app.js':null}])
  assert.throws(()=>createTrustedArtifactManifest(value),TypeError);
});
test('rejects oversized individual file',()=>{
 assert.throws(()=>createTrustedArtifactManifest({...files,'app.js':'a'.repeat(1024*1024+1)}),RangeError);
});
test('rejects oversized combined files',()=>{
 assert.throws(()=>createTrustedArtifactManifest({'index.html':'a'.repeat(800000),'styles.css':'b'.repeat(800000),'app.js':'c'.repeat(800000)}),RangeError);
});
test('returns immutable manifest and file records',()=>{
 const result=createTrustedArtifactManifest(files);
 assert.throws(()=>{result.deployable=true;},TypeError);
 assert.throws(()=>{result.files[0].sha256='forged';},TypeError);
 assert.throws(()=>{result.files.push({});},TypeError);
});

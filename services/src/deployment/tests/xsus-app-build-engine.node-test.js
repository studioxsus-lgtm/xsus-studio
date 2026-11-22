import test from 'node:test';
import assert from 'node:assert/strict';
import {createXsUsAppBuildArtifacts,createXsUsAppSavedProjectBuilder} from '../xsus-app-build-engine.js';
import {inspectServerBuild} from '../server-build-preflight.js';
test('server builds a complete three-file scaffold from a saved goal',()=>{
 const files=createXsUsAppBuildArtifacts({goal:'Task manager'});
 assert.deepEqual(Object.keys(files),['index.html','styles.css','app.js']);
 const review=inspectServerBuild(files);
 assert.equal(review.ok,true);
 assert.equal(review.deployable,false);
 assert.equal(review.manifest.files.length,3);
});
test('untrusted snapshot scripts and markup never become executable code',()=>{
 const files=createXsUsAppBuildArtifacts({goal:'<img src=x onerror=alert(1)>',
  buildArtifacts:{'app.js':'evil()'},html:'<script>evil()</script>'});
 assert.equal(files['index.html'].includes('<img'),false);
 assert.equal(files['index.html'].includes('&lt;img'),true);
 assert.equal(files['app.js'].includes('evil'),false);
 assert.equal(files['index.html'].includes('evil'),false);
});
test('rejects missing, malformed and oversized goals',()=>{
 for(const input of [null,{},[],{goal:''},{goal:'x'.repeat(1201)},{goal:'ok\u0000bad'}])
  assert.equal(createXsUsAppBuildArtifacts(input),null);
});
test('builder reads only an owner-scoped saved project',async()=>{
 const projectId='11111111-1111-4111-8111-111111111111';
 const ownerId='22222222-2222-4222-8222-222222222222';
 const filters={};
 const client={from:table=>{
  assert.equal(table,'xsus_builder_projects');
  return {select(fields){assert.equal(fields,'id,owner_id,snapshot');return this;},
   eq(k,v){filters[k]=v;return this;},
   async maybeSingle(){return {data:{id:projectId,owner_id:ownerId,snapshot:{goal:'Project'}},error:null};}};
 }};
 const files=await createXsUsAppSavedProjectBuilder(client)({projectId,ownerId});
 assert.equal(inspectServerBuild(files).ok,true);
 assert.deepEqual(filters,{id:projectId,owner_id:ownerId});
});
test('builder refuses another owner and does not produce artifacts',async()=>{
 const client={from:()=>({select(){return this;},eq(){return this;},
  async maybeSingle(){return {data:{id:'other',owner_id:'other',snapshot:{goal:'Project'}},error:null};}})};
 const result=await createXsUsAppSavedProjectBuilder(client)({projectId:'a',ownerId:'b'});
 assert.equal(result,null);
});

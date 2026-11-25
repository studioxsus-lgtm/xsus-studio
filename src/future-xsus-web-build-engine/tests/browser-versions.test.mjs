import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWebClient} from '../browser-client.mjs';
import {createWorkspaceController} from '../workspace-controller.mjs';
const id='11111111-1111-4111-8111-111111111111';
function setup(){const calls=[];const client=createWebClient({baseUrl:'https://example.com',getToken:async()=> 'token',fetchImpl:async(url,options)=>{calls.push({path:url.pathname,...options});return new Response(JSON.stringify({revision:options.method==='POST'?1:0}),{headers:{'Content-Type':'application/json'}})}});return {client,calls}}
test('list route',async()=>{const {client,calls}=setup();await client.listVersions(id);assert.equal(calls[0].path,'/projects/'+id+'/versions')});
test('get route',async()=>{const {client,calls}=setup();await client.getVersion(id,2);assert.equal(calls[0].path,'/projects/'+id+'/versions/2')});
test('save payload',async()=>{const {client,calls}=setup();const files={'index.html':'home'};await client.saveVersion(id,files,0);assert.deepEqual(JSON.parse(calls[0].body),{files,expectedRevision:0})});
test('restore route',async()=>{const {client,calls}=setup();await client.restoreVersion(id,1,2);assert.equal(calls[0].path,'/projects/'+id+'/versions/1/restore');assert.deepEqual(JSON.parse(calls[0].body),{expectedRevision:2})});
test('authentication header',async()=>{const {client,calls}=setup();await client.listVersions(id);assert.equal(calls[0].headers.Authorization,'Bearer token')});
test('reject invalid project',()=>assert.throws(()=>setup().client.listVersions('../bad')));
test('reject invalid revision',()=>assert.throws(()=>setup().client.getVersion(id,0)));
test('reject invalid files',()=>assert.throws(()=>setup().client.saveVersion(id,[],0)));
test('workspace adapter saves',async()=>{const {client}=setup();const w=createWorkspaceController({versions:{list:client.listVersions,get:client.getVersion,save:client.saveVersion},propose:async()=>{}});await w.open(id,{'index.html':'home'});await w.save();assert.equal(w.snapshot().revision,1);assert.equal(w.snapshot().dirty,false)});

import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCustomWebsite} from '../universal.mjs';
import {assembleApplication} from '../assembly.mjs';
import {createCoreRegeneration} from '../core-regeneration.mjs';
const spec={name:'Example',pages:[{path:'index.html',title:'Home',sections:[{kind:'hero',title:'Home',body:'Welcome'}]}],resources:[{name:'products',fields:{name:'string',available:'boolean'}}]};
test('database and API drafts remain inactive',()=>{
 const r=generateCustomWebsite(spec);
 assert.equal(r.api.resources[0].routes.length,5);
 assert.equal(r.api.resources[0].scope,'owner');
 assert.equal(r.api.executable,false);
 assert.equal(r.runtimeConnected,false);
 assert.ok(r.migration);
});
test('persistent runtime refuses missing database adapter',()=>{
 assert.throws(()=>assembleApplication(spec,{approveApi:true,requirePersistent:true,verifyIdentity:async()=>({id:'user'})}),/Persistent database adapter required/);
});
const transport={interpret:async()=>{throw Error('Unexpected core call')},plan:async()=>{throw Error('Unexpected core call')}};
const propose=createCoreRegeneration({transport,name:'Example'});
const files={'index.html':'<title>Home</title>','about.html':'<title>About</title>','style.css':'body{}'};
test('targeted edit preserves all other files and escapes title',async()=>{
 const r=await propose({files,prompt:'Ndrysho about.html: titulli: A & B <script>',revision:2,executionAllowed:false});
 assert.equal(r.files['index.html'],files['index.html']);
 assert.equal(r.files['style.css'],files['style.css']);
 assert.equal(r.files['about.html'],'<title>A &amp; B &lt;script&gt;</title>');
 assert.equal(r.baseRevision,2);
 assert.equal(r.contextualEditing,true);
 assert.equal(r.executable,false);
 assert.deepEqual(r.removedPaths,[]);
});
test('missing target is rejected',async()=>{
 await assert.rejects(propose({files,prompt:'edit missing.html: title: New',revision:0,executionAllowed:false}),/Invalid contextual target/);
});
test('unsupported targeted instruction is rejected',async()=>{
 await assert.rejects(propose({files,prompt:'edit about.html: delete everything',revision:0,executionAllowed:false}),/Unsupported contextual edit/);
});

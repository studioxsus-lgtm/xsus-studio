import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceController} from '../workspace-controller.mjs';
const initial={'index.html':'home'};
function setup(){let revision=0,files;const versions={list:async()=>({revision}),get:async()=>({files}),save:async(id,f,e)=>{assert.equal(e,revision);files=structuredClone(f);return {revision:++revision}}};return createWorkspaceController({versions,propose:async()=>({reviewRequired:true,executable:false,files:{'index.html':'new'}})})}
test('open new project',async()=>{const w=setup();await w.open('p',initial);assert.equal(w.snapshot().dirty,true)});
test('save and reopen',async()=>{const w=setup();await w.open('p',initial);w.edit('update','index.html','edited',0);await w.save();w.reset();await w.open('p');assert.equal(w.snapshot().source.files['index.html'],'edited')});
test('protect unsaved changes',async()=>{const w=setup();await w.open('p',initial);assert.throws(()=>w.open('q',initial),/Unsaved/)});
test('prepare and accept',async()=>{const w=setup();await w.open('p',initial);await w.prepare('change');assert.equal(w.snapshot().source.files['index.html'],'home');w.accept(0);assert.equal(w.snapshot().source.files['index.html'],'new')});
test('edit invalidates proposal',async()=>{const w=setup();await w.open('p',initial);await w.prepare('change');w.edit('update','index.html','manual',0);assert.equal(w.snapshot().proposal,null)});
test('reject proposal',async()=>{const w=setup();await w.open('p',initial);await w.prepare('change');w.reject();assert.equal(w.snapshot().proposal,null)});
test('reset clears state',async()=>{const w=setup();await w.open('p',initial);w.reset();assert.equal(w.snapshot().source,null)});
test('reset rejects stale open',async()=>{let resolve;const w=createWorkspaceController({versions:{list:()=>new Promise(r=>resolve=r),get:async()=>{},save:async()=>{}},propose:async()=>{}});const p=w.open('p',initial);w.reset();resolve({revision:0});await assert.rejects(p,/Session changed/);assert.equal(w.snapshot().id,null)});
test('invalid edit rejected',async()=>{const w=setup();await w.open('p',initial);assert.throws(()=>w.edit('snapshot'))});
test('save clears dirty',async()=>{const w=setup();await w.open('p',initial);await w.save();assert.equal(w.snapshot().dirty,false);assert.equal(w.snapshot().revision,1)});

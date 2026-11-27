// Register with the active runner: root Vitest or standalone Node test.
const {test}=process.env.VITEST ? await import('vitest') : await import('node:test');
import assert from 'node:assert/strict';
import {createWorkspace} from './workspace.mjs';
import {createLayerEditor} from './layers.mjs';
import {createBrandAssistant} from './assistant.mjs';
const dom={createElementNS(){return {setAttribute(){},append(){}}}};
const doc={version:'1.0.0',width:512,height:512,layers:[]};
const circle={id:'a',type:'circle',cx:20,cy:20,r:10,fill:'#123456'};
const make=()=>createWorkspace({dom,supabase:{auth:{getSession:async()=>({data:{session:null}})}}});
test('new project protects unsaved work',()=>{const w=make();w.newProject();assert.equal(w.state().dirty,true);assert.throws(()=>w.newProject(),/unsaved/);w.discard();assert.equal(w.state().editor,null)});
test('workspace editing and history',()=>{const w=make();w.newProject();w.edit('add',circle);assert.equal(w.state().editor.document.layers.length,1);w.edit('undo');assert.equal(w.state().editor.document.layers.length,0);w.edit('redo');assert.equal(w.state().editor.document.layers.length,1)});
test('invalid operation rejected',()=>{const w=make();w.newProject();assert.throws(()=>w.edit('unknown'),/invalid_operation/)});
test('invalid layer leaves history unchanged',()=>{const e=createLayerEditor(doc,{dom});assert.throws(()=>e.add({...circle,fill:'url(evil)'}));assert.equal(e.state().revision,0)});
test('duplicate IDs rejected',()=>{const e=createLayerEditor(doc,{dom});e.add(circle);assert.throws(()=>e.duplicate('a','a'));assert.equal(e.state().document.layers.length,1)});
test('assistant preserves variants when selecting',async()=>{const a=createBrandAssistant({client:{generate:async()=>({status:'generated',kit:{variants:[{document:doc},{document:{...doc,layers:[circle]}}]}})}});await a.generate({prompt:'Logo'});a.select(1);assert.equal(a.document().layers.length,1);assert.equal(a.state().variants.length,2)});
test('assistant cancellation ignores late result',async()=>{let finish;const a=createBrandAssistant({client:{generate:()=>new Promise(r=>finish=r)}});const pending=a.generate({prompt:'Logo'});a.cancel();finish({status:'generated',kit:{variants:[{document:doc}]}});await pending;assert.equal(a.state().status,'idle');assert.equal(a.state().variants.length,0)});

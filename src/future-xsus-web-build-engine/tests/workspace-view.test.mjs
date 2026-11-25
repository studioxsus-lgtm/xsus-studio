import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountWorkspaceView} from '../workspace-view.mjs';
import {createWorkspaceController} from '../workspace-controller.mjs';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.events={};this.value='';this.style={};this.attrs={}}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,fn){this.events[k]=fn}
 remove(){this.removed=true}
 fire(k){return this.events[k]?.()}
}
async function setup(){
 const workspace=createWorkspaceController({versions:{list:async()=>({revision:0}),get:async()=>{},save:async(id,files,revision)=>({revision:revision+1})},propose:async()=>{}});
 await workspace.open('p',{'index.html':'home','about.html':'about'});
 const document={createElement:tag=>new Element(tag)};
 const container=new Element('main');
 const view=mountWorkspaceView({document,container,workspace});
 const root=container.children[0], [toolbar,source,status]=root.children;
 const [files,devices,apply,save,refresh]=toolbar.children;
 return {workspace,view,root,source,status,files,devices,apply,save,refresh};
}
test('initial source loaded',async()=>{const s=await setup();assert.equal(s.source.value,'home');assert.equal(s.apply.disabled,true)});
test('typing enables apply and blocks save',async()=>{const s=await setup();s.source.value='changed';s.source.fire('input');assert.equal(s.apply.disabled,false);assert.equal(s.save.disabled,true)});
test('apply updates real controller',async()=>{const s=await setup();s.source.value='changed';s.source.fire('input');s.apply.fire('click');assert.equal(s.workspace.snapshot().source.files['index.html'],'changed');assert.equal(s.save.disabled,false)});
test('save clears dirty state',async()=>{const s=await setup();await s.save.fire('click');assert.equal(s.workspace.snapshot().dirty,false);assert.equal(s.save.disabled,true)});
test('switch source file',async()=>{const s=await setup();s.files.value='about.html';s.files.fire('change');assert.equal(s.source.value,'about')});
test('unapplied source blocks file switch',async()=>{const s=await setup();s.source.value='changed';s.source.fire('input');s.files.value='about.html';s.files.fire('change');assert.equal(s.files.value,'index.html');assert.equal(s.source.value,'changed')});
test('reset clears editor',async()=>{const s=await setup();s.workspace.reset();assert.equal(s.source.value,'');assert.equal(s.source.disabled,true)});
test('dispose removes view',async()=>{const s=await setup();s.view.dispose();assert.equal(s.root.removed,true)});
test('accessible source label',async()=>{const s=await setup();assert.equal(s.source.attrs['aria-label'],'Source code');assert.equal(s.status.attrs.role,'status')});

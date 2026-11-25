import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountUnifiedView} from '../unified-view.mjs';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.events={};this.value='';this.attrs={}}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,fn){this.events[k]=fn}
 remove(){this.removed=true}
 fire(k){return this.events[k]?.()}
}
function setup(){
 let state={id:null,dirty:false,busy:false,source:null,proposal:null};
 const listeners=new Set(),calls=[];
 const update=patch=>{state={...state,...patch};for(const fn of listeners)fn(state)};
 const workspace={snapshot:()=>state,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)},prepare:async p=>{calls.push(['prepare',p]);update({proposal:{baseRevision:0,changes:[{operation:'update',path:'index.html'}]}})},accept:r=>{calls.push(['accept',r]);update({proposal:null,dirty:true})},reject:()=>update({proposal:null})};
 const app={workspace,list:async()=>[{id:'p',status:'completed'},{id:'q',status:'failed'}],generate:async input=>{calls.push(['generate',input]);update({id:'p',dirty:true,source:{files:{'index.html':'home'},revision:0}})},open:async(id,details)=>calls.push(['open',id,details])};
 const container=new Element('main'),document={createElement:tag=>new Element(tag)};
 const view=mountUnifiedView({document,container,app}),root=container.children[0],controls=root.children[0];
 const [name,language,prompt,generate,projects,refresh,open,propose,accept,reject,download]=controls.children;
 return {view,root,name,language,prompt,generate,projects,refresh,open,propose,accept,reject,download,calls,update};
}
test('initial controls protect missing project',()=>{const s=setup();assert.equal(s.propose.disabled,true);assert.equal(s.accept.disabled,true);assert.equal(s.download.disabled,true)});
test('generate passes form values',async()=>{const s=setup();s.name.value='Site';s.prompt.value='Build';s.language.value='sq';await s.generate.fire('click');assert.deepEqual(s.calls[0],['generate',{name:'Site',language:'sq',prompt:'Build'}]);assert.equal(s.generate.disabled,true)});
test('refresh excludes failed projects',async()=>{const s=setup();await s.refresh.fire('click');assert.deepEqual(s.projects.children.map(x=>x.value),['p'])});
test('open passes selected project',async()=>{const s=setup();s.projects.value='p';s.name.value='Site';await s.open.fire('click');assert.equal(s.calls[0][1],'p')});
test('proposal displays changed files',async()=>{const s=setup();s.update({id:'p'});s.prompt.value='Change';await s.propose.fire('click');assert.equal(s.root.children[2].textContent,'update: index.html');assert.equal(s.accept.disabled,false)});
test('accept uses reviewed revision',async()=>{const s=setup();s.update({id:'p',proposal:{baseRevision:2,changes:[]}});await s.accept.fire('click');assert.deepEqual(s.calls[0],['accept',2])});
test('reject clears proposal',async()=>{const s=setup();s.update({id:'p',proposal:{baseRevision:0,changes:[]}});await s.reject.fire('click');assert.equal(s.accept.disabled,true)});
test('dispose removes root',()=>{const s=setup();s.view.dispose();assert.equal(s.root.removed,true)});

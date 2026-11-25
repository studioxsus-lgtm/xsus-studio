import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserPreview} from '../browser-preview.mjs';
function setup(files={'index.html':'home','about.html':'about','style.css':'body{}'}){
 const attrs={};const frame={style:{},setAttribute(k,v){attrs[k]=v},remove(){this.removed=true}};
 const document={createElement:()=>frame,defaultView:{DOMParser:class{parseFromString(html){return {querySelectorAll:()=>[],createElement:()=>({}),head:{prepend(){},append(){}},documentElement:{outerHTML:html}}}}}};
 const container={append(node){this.node=node}};
 return {preview:createBrowserPreview({document,container,files}),frame,attrs};
}
test('requires configuration',()=>assert.throws(()=>createBrowserPreview()));
test('requires index',()=>assert.throws(()=>setup({'about.html':'about'})));
test('initial desktop preview',()=>{const {preview,frame}=setup();assert.equal(preview.initial.width,1280);assert.equal(frame.style.width,'1280px')});
test('sandbox attributes',()=>{const {attrs}=setup();assert.equal(attrs.sandbox,'');assert.equal(attrs.referrerpolicy,'no-referrer')});
test('select page',()=>{const {preview,frame}=setup();assert.equal(preview.select('about.html').page,'about.html');assert.match(frame.srcdoc,/about/)});
test('reject unknown page',()=>assert.throws(()=>setup().preview.select('../bad.html')));
test('responsive tablet and mobile',()=>{const {preview}=setup();assert.equal(preview.resize('tablet').width,768);assert.equal(preview.resize('mobile').width,390)});
test('reject invalid device',()=>assert.throws(()=>setup().preview.resize('constructor')));
test('dispose',()=>{const {preview,frame}=setup();preview.dispose();assert.equal(frame.removed,true);assert.throws(()=>preview.select('index.html'))});
test('static preview contract',()=>assert.equal(setup().preview.initial.interactive,false));

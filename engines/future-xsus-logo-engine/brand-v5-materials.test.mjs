import test from 'node:test';
import assert from 'node:assert/strict';
import {brandManual,manualHTML,brandMaterial,materialFormats} from './brand-v5/materials.mjs';
import {renderEditor} from './editor.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
for(const language of ['en','fr','sq'])test('V5 manual '+language,()=>{const m=brandManual(doc,{name:'AXION',language});assert.equal(m.sections.length,4);assert.equal(m.identity.variants.length,3);assert.match(manualHTML(doc,{name:'AXION',language}),/<svg/);});
for(const [kind,[width,height]] of Object.entries(materialFormats))test('V5 editable material '+kind,()=>{const d=brandMaterial(doc,{kind,name:'AXION',subtitle:'Design'});assert.equal(d.width,width);assert.equal(d.height,height);assert.ok(d.layers.some(l=>l.id==='logo-0'&&l.matrix));assert.match(renderEditor(d),/<svg/);assert.equal(doc.layers[0].matrix,undefined);});
test('V5 manual escapes user content',()=>{const h=manualHTML(doc,{name:'<script>alert(1)</script>'});assert.ok(!h.includes('<script>'));assert.match(h,/&lt;script&gt;/);});
test('V5 rejects invalid materials and language',()=>{assert.throws(()=>brandMaterial(doc,{kind:'constructor',name:'A'}));assert.throws(()=>brandManual(doc,{name:'A',language:'xx'}));assert.throws(()=>brandManual(doc,{name:''}));});

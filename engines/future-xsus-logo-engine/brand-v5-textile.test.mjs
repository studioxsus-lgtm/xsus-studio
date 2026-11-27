import test from 'node:test';
import assert from 'node:assert/strict';
import {textileTemplates,textileMockup,textilePNG} from './brand-v5/textile.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
for(const template of textileTemplates)test('V5 textile '+template,()=>{const m=textileMockup(doc,{template});assert.match(m.svg,/<circle/);assert.match(m.svg,/url\(#weave\)/);assert.deepEqual(m.source,doc);});
test('V5 textile silhouettes are distinct',()=>{assert.equal(new Set(textileTemplates.map(template=>textileMockup(doc,{template}).svg)).size,textileTemplates.length);});
test('V5 textile texture and scale change rendering',()=>{assert.notEqual(textileMockup(doc).svg,textileMockup(doc,{texture:0,scale:.4}).svg);});
test('V5 textile PNG dimensions',()=>{const p=Buffer.from(textilePNG(doc));assert.equal(p.readUInt32BE(16),800);assert.equal(p.readUInt32BE(20),800);});
test('V5 textile invalid parameters',()=>{for(const o of [{template:'constructor'},{texture:2},{scale:NaN},{color:'url(x)'}])assert.throws(()=>textileMockup(doc,o));});

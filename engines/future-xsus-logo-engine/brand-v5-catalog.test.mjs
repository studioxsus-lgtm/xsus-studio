import test from 'node:test';
import assert from 'node:assert/strict';
import {brandCatalog,catalogMockup,catalogPNG,catalogAnimation,architectureTemplates} from './brand-v5/catalog.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
test('V5 catalog fifty unique motion profiles and eighty mockups',()=>{const c=brandCatalog();assert.equal(new Set(c.animation).size,50);assert.equal(new Set(c.mockups.map(m=>m.id)).size,80);});
for(const m of brandCatalog().mockups)test('V5 catalog dispatch '+m.id,()=>{const scene=catalogMockup(doc,m.id);assert.match(scene.svg,/<svg/);assert.deepEqual(scene.source,doc);});
test('V5 architecture distinct silhouettes',()=>{assert.equal(new Set(architectureTemplates.map(n=>catalogMockup(doc,'architecture:'+n).svg)).size,8);});
test('V5 catalog PNG real output',()=>{const p=Buffer.from(catalogPNG(doc,'architecture:facade'));assert.equal(p.readUInt32BE(16),800);});
test('V5 catalog rejects unknown IDs and preserves selected template',()=>{assert.throws(()=>catalogMockup(doc,'constructor:x'));assert.throws(()=>catalogMockup(doc,'flat:bad'));assert.equal(catalogMockup(doc,'flat:business-card',{template:'letterhead'}).template,'business-card');assert.equal(catalogAnimation(doc,'fade',{profile:'bad'}).duration,3);});

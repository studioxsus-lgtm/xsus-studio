import test from 'node:test';
import assert from 'node:assert/strict';
import {mockupTemplates,mockupScene,mockupPNG} from './brand-v5/mockup.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
for(const template of mockupTemplates)test('V5 mockup '+template,()=>{const before=structuredClone(doc),m=mockupScene(doc,{template});assert.equal(m.template,template);assert.match(m.svg,/<circle/);assert.match(m.svg,/clip-path/);assert.deepEqual(doc,before);});
test('V5 mockup parameters change actual geometry',()=>{assert.notEqual(mockupScene(doc).svg,mockupScene(doc,{scale:.4,rotation:10,offsetX:.1}).svg);});
test('V5 mockup renders real PNG',()=>{const p=mockupPNG(doc);assert.deepEqual([...p.slice(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(Buffer.from(p).readUInt32BE(16),1000);});
test('V5 mockup rejects unsafe parameters',()=>{for(const options of [{template:'constructor'},{background:'url(x)'},{scale:Infinity},{rotation:90},{offsetX:1}])assert.throws(()=>mockupScene(doc,options));});

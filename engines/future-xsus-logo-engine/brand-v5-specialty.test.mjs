import test from 'node:test';import assert from 'node:assert/strict';import {specialtyTemplates,specialtyMockup} from './brand-v5/specialty.mjs';import {Resvg} from '@resvg/resvg-js';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
for(const template of specialtyTemplates)test('V5 specialty '+template,()=>{const m=specialtyMockup(doc,{template});assert.deepEqual(m.source,doc);assert.equal(Buffer.from(new Resvg(m.svg).render().asPng()).readUInt32BE(16),800);});
test('V5 specialty distinct layouts',()=>assert.equal(new Set(specialtyTemplates.map(template=>specialtyMockup(doc,{template}).svg)).size,24));
test('V5 specialty rejects invalid options',()=>{assert.throws(()=>specialtyMockup(doc,{template:'constructor'}));assert.throws(()=>specialtyMockup(doc,{scale:0}));});

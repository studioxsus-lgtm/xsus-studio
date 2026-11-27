import test from 'node:test';import assert from 'node:assert/strict';import {eventRetailTemplates,eventRetailMockup} from './brand-v5/event-retail.mjs';import {Resvg} from '@resvg/resvg-js';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
for(const template of eventRetailTemplates)test('V5 event retail '+template,()=>{const m=eventRetailMockup(doc,{template});assert.deepEqual(m.source,doc);assert.equal(Buffer.from(new Resvg(m.svg).render().asPng()).readUInt32BE(16),800);});
test('V5 event retail distinct layouts',()=>assert.equal(new Set(eventRetailTemplates.map(template=>eventRetailMockup(doc,{template}).svg)).size,20));
test('V5 event retail rejects invalid options',()=>{assert.throws(()=>eventRetailMockup(doc,{template:'constructor'}));assert.throws(()=>eventRetailMockup(doc,{scale:0}));});

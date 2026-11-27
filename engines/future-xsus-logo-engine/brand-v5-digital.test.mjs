import test from 'node:test';import assert from 'node:assert/strict';import {digitalTemplates,digitalMockup} from './brand-v5/digital.mjs';import {Resvg} from '@resvg/resvg-js';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
for(const template of digitalTemplates)test('V5 digital '+template,()=>{const m=digitalMockup(doc,{template});assert.deepEqual(m.source,doc);const p=Buffer.from(new Resvg(m.svg).render().asPng());assert.equal(p.readUInt32BE(16),m.width);});
test('V5 digital rejects invalid options',()=>{assert.throws(()=>digitalMockup(doc,{template:'constructor'}));assert.throws(()=>digitalMockup(doc,{scale:Infinity}));});

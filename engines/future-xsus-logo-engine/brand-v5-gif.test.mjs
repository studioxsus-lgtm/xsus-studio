import test from 'node:test';import assert from 'node:assert/strict';import {animatedGIF} from './brand-v5/gif.mjs';import {extendedTimeline} from './brand-v5/motion-export.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
test('GIF header dimensions trailer and loop',()=>{const p=animatedGIF(doc,extendedTimeline(doc,{duration:1}),{width:64,fps:3});assert.equal(p.toString('ascii',0,6),'GIF89a');assert.equal(p.readUInt16LE(6),64);assert.equal(p.at(-1),59);assert.ok(p.includes(Buffer.from('NETSCAPE2.0')));});
test('GIF deterministic and immutable',()=>{const t=extendedTimeline(doc,{duration:1}),before=structuredClone(doc);assert.deepEqual(animatedGIF(doc,t,{width:64,fps:3}),animatedGIF(doc,t,{width:64,fps:3}));assert.deepEqual(doc,before);});
test('GIF rejects excessive work',()=>assert.throws(()=>animatedGIF(doc,extendedTimeline(doc,{duration:30}),{fps:25})));

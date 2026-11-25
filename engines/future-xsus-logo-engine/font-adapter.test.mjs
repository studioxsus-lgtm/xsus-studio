import test from 'node:test';import assert from 'node:assert/strict';import {outlineProfessional} from './font-adapter.mjs';import {lettermark} from './advanced.mjs';import {exportPDF} from './pdf.mjs';
const doc=()=>lettermark('XSUS').document;
const shape=async()=>[[['M',1,1],['L',10,1],['L',10,10],['Z']]];
test('adapter contract',async()=>{const d=doc();const v=await outlineProfessional(d,{fontId:'test',shape});assert.equal(v.layers[0].type,'path');assert.equal(d.layers[0].type,'text');assert.ok(exportPDF(v).length)});
test('missing adapter',async()=>assert.rejects(outlineProfessional(doc())));
test('invalid path',async()=>assert.rejects(outlineProfessional(doc(),{fontId:'test',shape:async()=>[[['BAD',1,2]]]})));
test('empty glyph result',async()=>assert.rejects(outlineProfessional(doc(),{fontId:'test',shape:async()=>[]})));
test('adapter error propagates',async()=>assert.rejects(outlineProfessional(doc(),{fontId:'test',shape:async()=>{throw new Error('font unavailable')}}),/font unavailable/));

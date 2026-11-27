import test from 'node:test';import assert from 'node:assert/strict';import {refineComposition} from './graphic-v3/refinement.mjs';
const doc=()=>({version:'1.0.0',width:512,height:512,graphic:{version:'3.0.0'},layers:[{id:'mark',type:'path',fill:'#123456',commands:[['M',30,180],['L',130,180],['L',130,280],['L',30,280],['Z']]}]});
test('refinement improves off-center mark without mutating source',()=>{const d=doc(),copy=structuredClone(d),r=refineComposition(d);assert.equal(r.refinement.accepted,true);assert.ok(r.refinement.after<r.refinement.before);assert.deepEqual(d,copy);});
test('explicit composition is locked',()=>{const d=doc(),r=refineComposition(d,{locked:true});assert.equal(r.refinement.attempts,0);assert.deepEqual(r.document,d);});

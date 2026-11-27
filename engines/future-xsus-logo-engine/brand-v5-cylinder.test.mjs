import test from 'node:test';
import assert from 'node:assert/strict';
import {cylinderTemplates,surfaceMaterials,cylinderCoordinate,cylinderMockup,cylinderPNG} from './brand-v5/cylinder.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
for(const template of cylinderTemplates)test('V5 cylinder '+template,()=>{const m=cylinderMockup(doc,{template});assert.equal(m.parameters.template,template);assert.equal((m.svg.match(/<use /g)||[]).length,48);assert.deepEqual(m.source,doc);});
for(const material of surfaceMaterials)test('V5 surface '+material,()=>{assert.notEqual(cylinderMockup(doc,{material,light:1}).svg,cylinderMockup(doc,{material,light:0}).svg);});
test('V5 cylinder mapping symmetric and nonlinear',()=>{assert.equal(cylinderCoordinate(.5,100,1),0);assert.ok(Math.abs(cylinderCoordinate(0,100,1)+cylinderCoordinate(1,100,1))<1e-8);assert.notEqual(cylinderCoordinate(.75,100,1),cylinderCoordinate(1,100,1)/2);});
test('V5 cylinder real PNG',()=>{const p=Buffer.from(cylinderPNG(doc));assert.equal(p.readUInt32BE(16),800);assert.equal(p.readUInt32BE(20),800);});
test('V5 cylinder validates options',()=>{for(const o of [{template:'constructor'},{material:'bad'},{arc:2},{scale:Infinity},{light:-1},{strips:1000},{color:'url(x)'}])assert.throws(()=>cylinderMockup(doc,o));});

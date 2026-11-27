import test from 'node:test';import assert from 'node:assert/strict';import {chooseComposition} from './graphic-v3/composition-direction.mjs';import {composition} from './graphic-v3/composition.mjs';
test('automatic composition diversifies square variants',()=>{const a=[0,1,2].map(slot=>chooseComposition({slot,preferred:'horizontal'}));assert.equal(new Set(a).size,3);});
test('explicit layout and icon requests preserved',()=>{assert.equal(chooseComposition({explicit:'emblem',slot:2}),'emblem');assert.equal(chooseComposition({prompt:'icon only',slot:2}),'symbol');});
test('wide and tall artboards use bounded layout boxes',()=>{for(const [width,height] of [[1200,400],[400,1200]])for(let slot=0;slot<3;slot++){const l=chooseComposition({width,height,slot}),p=composition(l,width,height,'AXION');assert.ok(p.cx-p.w/2>=0&&p.cx+p.w/2<=width);assert.ok(p.cy-p.h/2>=0&&p.cy+p.h/2<=height);}});

test('primary concept preserves style direction on wide artboards',()=>{assert.equal(chooseComposition({preferred:'central',width:800,height:400,slot:0}),'central');assert.equal(chooseComposition({preferred:'central',width:800,height:400,slot:1}),'horizontal');});

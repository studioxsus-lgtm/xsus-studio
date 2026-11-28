import test from 'node:test';import assert from 'node:assert/strict';import {interpret,inks} from './creative-v2/intent.mjs';
const brief={name:'AXION'},opts={version:'2.0.0'};
test('qualified concept count and deep blue from real AXION brief',()=>{const r=interpret('Create 6 premium futuristic logo concepts for "AXION". Use violet and deep blue colors.',brief,opts);assert.equal(r.count,6);assert.deepEqual(r.colors,['violet','deepBlue']);assert.equal(inks.deepBlue,'#142857');});
test('qualified written count and explicit override',()=>{assert.equal(interpret('Create six premium futuristic logo concepts',brief,opts).count,6);assert.equal(interpret('Create 6 premium logo concepts',brief,{...opts,count:3}).count,3);});
test('qualified counts in French and Albanian',()=>{assert.equal(interpret('Créer 9 concepts modernes',brief,opts).count,9);assert.equal(interpret('Krijo 6 koncepte moderne',brief,opts).count,6);});

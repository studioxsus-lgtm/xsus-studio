import test from 'node:test';import assert from 'node:assert/strict';import {advancedSymbol,lettermark,PHI} from './advanced.mjs';
for(const kind of ['rosette','spiral','cutout'])test(kind,()=>{const a=advancedSymbol({kind});assert.match(a.svg,/<svg/);assert.deepEqual(a,advancedSymbol({kind}))});
test('radial count',()=>assert.equal(advancedSymbol({count:12}).document.layers.length,12));
test('golden ratio',()=>assert.ok(Math.abs(PHI*PHI-PHI-1)<1e-12));
test('invalid count',()=>assert.throws(()=>advancedSymbol({count:100})));
test('invalid color',()=>assert.throws(()=>advancedSymbol({color:'red'})));
test('unknown kind',()=>assert.throws(()=>advancedSymbol({kind:'x'})));
test('lettermark',()=>assert.equal(lettermark('Ëndrra Çel').document.layers[0].text,'ËÇ'));
test('invalid name',()=>assert.throws(()=>lettermark('!!!')));

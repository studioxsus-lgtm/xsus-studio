import test from 'node:test';import assert from 'node:assert/strict';import {zipBrand} from './zip.mjs';
const bytes=new TextEncoder().encode('123456789');
test('ZIP signatures and CRC',()=>{const z=zipBrand([{name:'logo.svg',bytes}]),v=new DataView(z.buffer);assert.equal(v.getUint32(0,true),0x04034b50);assert.equal(v.getUint32(14,true),0xcbf43926);assert.equal(v.getUint32(z.length-22,true),0x06054b50);assert.equal(v.getUint32(v.getUint32(z.length-6,true),true),0x02014b50)});
test('reject traversal',()=>assert.throws(()=>zipBrand([{name:'../logo.svg',bytes}])));
test('reject duplicate',()=>assert.throws(()=>zipBrand([{name:'logo.svg',bytes},{name:'LOGO.svg',bytes}])));
test('reject empty',()=>assert.throws(()=>zipBrand([])));
test('deterministic',()=>assert.deepEqual(zipBrand([{name:'logo.svg',bytes}]),zipBrand([{name:'logo.svg',bytes}])));

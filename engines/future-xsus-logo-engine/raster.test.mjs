import test from 'node:test';import assert from 'node:assert/strict';import {exportRaster,exportPackage} from './raster.mjs';import {brandKit} from './brand.mjs';
const doc=()=>brandKit({name:'XSUS'}).variants[0].document;
test('package SVG JSON',async()=>{const f=await exportPackage(doc());assert.equal(f.length,2);assert.equal(f[0].blob.type,'image/svg+xml');assert.match(await f[0].blob.text(),/<svg/)});
test('duplicate formats',async()=>assert.rejects(exportPackage(doc(),{formats:['svg','svg']})));
test('invalid format',async()=>assert.rejects(exportRaster(doc(),{format:'pdf'})));
test('invalid scale',async()=>assert.rejects(exportRaster(doc(),{scale:5})));
test('invalid quality',async()=>assert.rejects(exportRaster(doc(),{quality:2})));
test('pixel budget',async()=>assert.rejects(exportRaster({...doc(),width:8192,height:8192})));
test('missing browser capability',async()=>{if(typeof OffscreenCanvas==='undefined')await assert.rejects(exportRaster(doc()),/capability/)});

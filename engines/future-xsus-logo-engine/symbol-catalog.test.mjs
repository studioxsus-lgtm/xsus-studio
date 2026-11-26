import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogIds,catalogRequest} from './symbol-catalog.mjs';
import {brandKit} from './brand.mjs';
test('1000 distinct editable shapes render in all three compositions',()=>{
 const shapes=new Set();
 for(const id of catalogIds){
  assert.equal(catalogRequest('Logo for "TEST"\n[XSUS symbol: '+id+']','TEST'),id);
  const {variants}=brandKit({name:'TEST',catalogId:id});
  assert.equal(variants.length,3);
  shapes.add(JSON.stringify(variants[0].document.layers[0].commands));
  for(const v of variants){assert.match(v.svg,/<path /);assert.equal(v.document.layers.at(-1).text,'TEST')}
 }
 assert.equal(shapes.size,1000);
});
test('recognizes a rocket in EN, SQ, FR and ignores the brand',()=>{
 for(const term of ['rocket','raketë','fusée']) assert.equal(catalogRequest('Logo "COSMOS" '+term,'COSMOS'),'rocket');
 assert.equal(catalogRequest('Design "Rocket"','Rocket'),null);
});

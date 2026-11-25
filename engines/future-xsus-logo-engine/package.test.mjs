import test from 'node:test';import assert from 'node:assert/strict';import {exportBrandArchive} from './package.mjs';import {advancedSymbol,lettermark} from './advanced.mjs';
const doc=()=>advancedSymbol().document;
test('vector package',async()=>{const r=await exportBrandArchive(doc(),{formats:['svg','json','pdf']});assert.equal(r.mime,'application/zip');const v=new DataView(r.bytes.buffer);assert.equal(v.getUint16(r.bytes.length-12,true),3);assert.ok(new TextDecoder().decode(r.bytes).includes('%PDF-1.4'))});
test('default package',async()=>assert.deepEqual((await exportBrandArchive(doc())).formats,['svg','json']));
test('unknown format',async()=>assert.rejects(exportBrandArchive(doc(),{formats:['exe']})));
test('duplicate format',async()=>assert.rejects(exportBrandArchive(doc(),{formats:['svg','svg']})));
test('text PDF fails without partial archive',async()=>assert.rejects(exportBrandArchive(lettermark('XSUS').document,{formats:['svg','pdf']}),/font embedding/));

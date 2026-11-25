import test from 'node:test';import assert from 'node:assert/strict';import {exportTypographyPDF,exportTypographyArchive} from './font-export.mjs';import {lettermark} from './advanced.mjs';
const library={shape:async()=>[[['M',1,1],['L',20,1],['L',20,20],['Z']]]};
test('typography PDF',async()=>{const d=lettermark('XSUS').document;assert.match(new TextDecoder().decode(await exportTypographyPDF(d,{library,fontId:'test'})),/^%PDF-1.4/);assert.equal(d.layers[0].type,'text')});
test('typography archive',async()=>{const r=await exportTypographyArchive(lettermark('XSUS').document,{library,fontId:'test'});assert.deepEqual(r.formats,['svg','pdf','json']);assert.equal(r.mime,'application/zip')});
test('missing library fails',async()=>assert.rejects(exportTypographyPDF(lettermark('XSUS').document,{fontId:'test'})));

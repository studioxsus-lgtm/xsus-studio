import test from 'node:test';import assert from 'node:assert/strict';import {exportPDF} from './pdf.mjs';import {advancedSymbol,lettermark} from './advanced.mjs';
for(const kind of ['rosette','spiral','cutout'])test('PDF '+kind,()=>{const s=new TextDecoder().decode(exportPDF(advancedSymbol({kind}).document));assert.ok(s.startsWith('%PDF-1.4'));assert.ok(s.endsWith('%%EOF\n'));const offset=Number(s.match(/startxref\n(\d+)/)[1]);assert.equal(s.slice(offset,offset+4),'xref');assert.ok(!s.includes('/Subtype /Image'))});
test('text fails explicitly',()=>assert.throws(()=>exportPDF(lettermark('XSUS').document),/font embedding/));
test('invalid document',()=>assert.throws(()=>exportPDF({})));

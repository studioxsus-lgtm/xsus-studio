import test from 'node:test';import assert from 'node:assert/strict';import {outlineBlockText} from './outlines.mjs';import {lettermark} from './advanced.mjs';import {exportPDF} from './pdf.mjs';
test('convert monogram',()=>{const d=lettermark('XSUS Studio').document;const v=outlineBlockText(d);assert.equal(v.layers.length,2);assert.ok(v.layers.every(l=>l.type==='path'));assert.equal(d.layers[0].type,'text')});
test('PDF outlines',()=>assert.match(new TextDecoder().decode(exportPDF(outlineBlockText(lettermark('XSUS').document))),/^%PDF-1.4/));
test('unsupported alphabet',()=>{const d=lettermark('XSUS').document;d.layers[0].text='Ë';assert.throws(()=>outlineBlockText(d))});
test('deterministic',()=>{const d=lettermark('XSUS').document;assert.deepEqual(outlineBlockText(d),outlineBlockText(d))});

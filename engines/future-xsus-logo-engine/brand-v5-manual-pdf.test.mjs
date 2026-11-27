import test from 'node:test';import assert from 'node:assert/strict';import {brandGuidelinesPDF} from './brand-v5/manual-pdf.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
for(const language of ['en','fr','sq'])test('V5 PDF '+language,()=>{const p=brandGuidelinesPDF(doc,{name:'AXION',language}).toString('latin1');assert.ok(p.startsWith('%PDF-1.4'));assert.match(p,/\/Count 3/);assert.equal((p.match(/\/Subtype \/Image/g)||[]).length,3);const x=Number(p.match(/startxref\n(\d+)/)[1]);assert.equal(p.slice(x,x+4),'xref');assert.ok(p.includes('#112233'));});
test('V5 PDF rejects invalid language',()=>assert.throws(()=>brandGuidelinesPDF(doc,{name:'AXION',language:'de'})));

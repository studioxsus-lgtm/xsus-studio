import test from 'node:test';import assert from 'node:assert/strict';import {zipStructured} from './brand-v5/structured-zip.mjs';import {structuredBrandPackage} from './brand-v5/structured-package.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
test('structured archive rejects unsafe paths',()=>{for(const name of ['../a.txt','/a.txt','a/../b.txt','a\\b.txt'])assert.throws(()=>zipStructured([{name,bytes:Buffer.from('x')}]))});
test('structured archive accepts nested paths',()=>assert.equal(Buffer.from(zipStructured([{name:'source/a.json',bytes:Buffer.from('{}')}])).readUInt32LE(0),0x04034b50));
test('structured package includes real categorized files',async()=>{const p=await structuredBrandPackage(doc,{name:'AXION',mockups:[]});for(const n of ['primary/logo.svg','guidelines/guidelines.pdf','color/palette.json','typography/fonts.json','licenses/NOTICE.txt','source/source.json'])assert.ok(p.manifest.files.some(f=>f.name===n&&f.size>0));});
test('structured package rejects invalid video format',async()=>assert.rejects(structuredBrandPackage(doc,{name:'AXION',videos:['avi']})));

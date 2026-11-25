import test from 'node:test';import assert from 'node:assert/strict';import {createFontLibrary} from './font-library.mjs';
const bytes=()=>Uint8Array.from([0,1,0,0,0,0,0,0,0,0,0,0]);
const parse=()=>({getPath:()=>({commands:[{type:'M',x:0,y:0},{type:'Z'}]}),getAdvanceWidth:()=>10,charToGlyphIndex:()=>1});
test('register and remove',()=>{const l=createFontLibrary({parse});l.register('font',bytes());assert.deepEqual(l.list(),['font']);assert.equal(l.status().bytes,12);assert.equal(l.remove('font'),true);assert.equal(l.status().bytes,0)});
test('duplicate',()=>{const l=createFontLibrary({parse});l.register('font',bytes());assert.throws(()=>l.register('font',bytes()))});
test('signature',()=>assert.throws(()=>createFontLibrary({parse}).register('font',new Uint8Array(12))));
test('budget',()=>{const l=createFontLibrary({parse,maxBytes:12});l.register('a',bytes());assert.throws(()=>l.register('b',bytes()))});
test('parser failure is atomic',()=>{const l=createFontLibrary({parse:()=>{throw Error('bad font')}});assert.throws(()=>l.register('a',bytes()));assert.equal(l.status().count,0)});
test('shape registered font',async()=>{const l=createFontLibrary({parse});l.register('a',bytes());assert.ok((await l.shape({fontId:'a',text:'XSUS',fontSize:20,x:0,y:0})).length)});

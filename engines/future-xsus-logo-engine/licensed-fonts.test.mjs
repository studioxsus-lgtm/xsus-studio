import test from 'node:test';import assert from 'node:assert/strict';import {createLicensedFonts} from './licensed-fonts.mjs';import {lettermark} from './advanced.mjs';
const metadata={id:'demo',family:'Demo',category:'serif',license:'OFL-1.1',source:'https://example.com/font',commercialUse:true,outlineUse:true};
const bytes=Uint8Array.from([0,1,0,0,0,0,0,0,0,0,0,0]);
const parse=()=>({charToGlyphIndex:()=>1,getAdvanceWidth:()=>20,getPath:()=>({commands:[{type:'M',x:1,y:1},{type:'L',x:20,y:1},{type:'L',x:20,y:20},{type:'Z'}]})});
test('approved export',async()=>{const l=createLicensedFonts({parse});l.register(metadata,bytes);assert.ok((await l.pdf(lettermark('XSUS').document,{fontId:'demo'})).length)});
test('restricted export',async()=>{const l=createLicensedFonts({parse});l.register({...metadata,commercialUse:false},bytes);await assert.rejects(l.pdf(lettermark('XSUS').document,{fontId:'demo'}))});
test('registration rollback',()=>{const l=createLicensedFonts({parse});assert.throws(()=>l.register(metadata,new Uint8Array(12)));assert.equal(l.list().length,0)});
test('removed font cannot export',async()=>{const l=createLicensedFonts({parse});l.register(metadata,bytes);l.remove('demo');await assert.rejects(l.pdf(lettermark('XSUS').document,{fontId:'demo'}))});

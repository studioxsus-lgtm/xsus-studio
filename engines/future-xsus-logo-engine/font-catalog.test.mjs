import test from 'node:test';import assert from 'node:assert/strict';import {createFontCatalog} from './font-catalog.mjs';
const entry={id:'test',family:'Test',category:'serif',license:'OFL-1.1',source:'https://example.com/font',commercialUse:true,outlineUse:true};
test('register and filter',()=>{const c=createFontCatalog();c.register(entry);assert.equal(c.list({category:'serif',commercialOnly:true}).length,1);assert.equal(c.requireOutline('test').id,'test')});
test('duplicate rejected',()=>{const c=createFontCatalog();c.register(entry);assert.throws(()=>c.register(entry))});
test('commercial restriction',()=>{const c=createFontCatalog();c.register({...entry,commercialUse:false});assert.throws(()=>c.requireOutline('test'));assert.equal(c.requireOutline('test',{commercial:false}).id,'test')});
test('outline restriction',()=>{const c=createFontCatalog();c.register({...entry,outlineUse:false});assert.throws(()=>c.requireOutline('test'))});
test('unsafe source',()=>assert.throws(()=>createFontCatalog().register({...entry,source:'file:///tmp/font'})));
test('unknown font',()=>assert.throws(()=>createFontCatalog().requireOutline('missing')));

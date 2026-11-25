import test from 'node:test';import assert from 'node:assert/strict';import {createOpenTypeProvider} from './opentype-provider.mjs';import {outlineProfessional} from './font-adapter.mjs';import {lettermark} from './advanced.mjs';
const font={charToGlyphIndex:()=>1,getAdvanceWidth:()=>20,getPath:(t,x,y)=>({commands:[{type:'M',x,y},{type:'Q',x1:x+1,y1:y-2,x:x+3,y},{type:'Z'}]})};
const args={fontId:'demo',text:'ËÇ',fontSize:20,x:50,y:60};
test('centered OpenType commands',async()=>assert.deepEqual(await createOpenTypeProvider(new Map([['demo',font]]))(args),[[['M',40,60],['Q',41,58,43,60],['Z']]]));
test('missing font',async()=>assert.rejects(createOpenTypeProvider(new Map())(args)));
test('missing glyph',async()=>assert.rejects(createOpenTypeProvider(new Map([['demo',{...font,charToGlyphIndex:()=>0}]]))(args),/Missing glyph/));
test('adapter integration',async()=>{const d=await outlineProfessional(lettermark('XSUS').document,{fontId:'demo',shape:createOpenTypeProvider(new Map([['demo',font]]))});assert.equal(d.layers[0].type,'path')});
test('invalid geometry',async()=>assert.rejects(createOpenTypeProvider(new Map([['demo',font]]))({...args,fontSize:-1})));

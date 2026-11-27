import test from 'node:test';
import assert from 'node:assert/strict';
import {brandGuidelines,brandVariant,colorSpec} from './brand-v5/guidelines.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'},{id:'brand',type:'text',text:'AXION',x:128,y:200,fontSize:22,fontFamily:'sans-serif',fill:'#112233'}]};
test('V5 extracts palette and typography without mutation',()=>{const before=structuredClone(doc),g=brandGuidelines(doc);assert.equal(g.colors.length,1);assert.deepEqual(g.colors[0].rgb,[17,34,51]);assert.deepEqual(g.fonts,['sans-serif']);assert.deepEqual(doc,before);assert.equal(g.usage.minimumSize,null);});
test('V5 monochrome variants preserve geometry and source',()=>{for(const [kind,color] of [['black','#000000'],['white','#ffffff']]){const v=brandVariant(doc,kind);assert.deepEqual(v.layers,doc.layers.map(l=>({...l,fill:color})));}assert.equal(doc.layers[0].fill,'#112233');});
test('V5 color conversions and invalid inputs',()=>{assert.deepEqual(colorSpec('#000000').cmykApprox,[0,0,0,100]);assert.deepEqual(colorSpec('#ff0000').hsl,[0,100,50]);assert.throws(()=>colorSpec('url(x)'));assert.throws(()=>brandVariant(doc,'unknown'));});

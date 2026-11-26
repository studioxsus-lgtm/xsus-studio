import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrchestrator} from './orchestrator.mjs';
import {createUserGateway} from './user-gateway.mjs';
import {createLogoServer} from './api.mjs';
import {renderEditor} from './editor.mjs';
import {composeCreative} from './creative-v2/compose.mjs';
import {profiles,classify} from './creative-v2/industries.mjs';
import {glyphs,outline,monogram} from './creative-v2/alphabet.mjs';
import {regular,area,combine,layer,similarity} from './creative-v2/contours.mjs';
import {families,procedure} from './creative-v2/procedural.mjs';
import {options,interpret} from './creative-v2/intent.mjs';

const spec={version:'2.0.0',seed:123};
const generate=(prompt,opts={},language='en')=>composeCreative({prompt,brief:{name:'ORION'},strategy:{approved:true},language,creative:{...spec,...opts}});
for(const f of families)test('bounded procedure '+f,()=>{
 assert.deepEqual(procedure(f,33,3),procedure(f,33,3));
 assert.throws(()=>procedure(f,33,200));
 assert.ok(procedure(f,33,3).flat().length<4096);
});
for(const c of glyphs)test('editable outline '+c,async()=>{
 const rings=await outline(c,'minimal');assert.ok(area(rings)>20);
 assert.ok((await monogram(c,'rounded','open')).flat().length>4);
});
for(const chars of ['AX','XS','AB','MK','NOVA','XSUS','ëÇxZ3'])test('monogram '+chars,async()=>{
 const x=await monogram(chars,'luxury','ligature'),y=await monogram(chars,'futuristic','woven');
 assert.ok(x.length&&y.length);assert.notDeepEqual(x,y);
});
test('nonzero holes and contour validation',()=>{
 const cut=combine([regular(6,90)],[regular(4,30)],'cut');
 assert.equal(combine(cut,[regular(3,10)],'intersect').length,0);
 assert.ok(area(cut)>100);
 assert.throws(()=>combine([[[Infinity,0],[1,1],[2,2]]]));
 assert.throws(()=>layer('bad',[Array.from({length:600},(_,i)=>[i,i])],'#ffffff'));
});
for(const [language,prompt,required] of [
 ['en','lion and crown',['lion','crown']],['sq','shkronja X me rrjet neural',['network']],['fr','montagne soleil rivière',['mountain','sun','river']],
 ['en','tree with a circuit',['tree','circuit']],['sq','shqiponjë me mburojë',['eagle','shield']],['fr','livre et ampoule',['book','bulb']],['en','heart with electronic wave',['heart','wave']]
])test('composed fusion '+prompt,async()=>{
 const result=await generate(prompt,{count:6},language);
 assert.equal(result.status,'generated');for(const v of result.kit.variants){
  assert.deepEqual(v.document.creative.subjects,required);assert.match(v.svg,/<path/);assert.ok(v.quality.occupancy>0);
 }
});
for(const [lang,text] of [['en','Luxury lion but without a crown, using black and gold'],['sq','Luan pa kurorë, me të zezë dhe të artë'],['fr','Lion sans couronne en noir et or']])test('negative instruction '+lang,async()=>{
 const res=await generate(text,{},lang);assert.equal(res.status,'generated');
 assert.deepEqual(res.kit.variants[0].document.creative.subjects,['lion']);
});
for(const count of [3,6,9,12])test('determinism and concept count '+count,async()=>{
 const a=await generate('radial abstract',{count}),b=await generate('radial abstract',{count});
 assert.equal(a.status,'generated');assert.equal(a.kit.variants.length,count);
 assert.deepEqual(a,b);
 assert.equal(new Set(a.kit.variants.map(v=>JSON.stringify(v.document.layers[0].commands))).size,count);
});
test('selective revision and independent slots',async()=>{
 const a=await generate('heart with wave',{count:6}),b=await generate('heart with wave',{count:6,slot:2,revision:1});
 assert.equal(b.kit.variants.length,1);assert.equal(b.kit.variants[0].document.creative.slot,2);
 assert.notDeepEqual(b.kit.variants[0].document.layers,a.kit.variants[2].document.layers);
});
test('each business profile has a graphic, three semantic labels and three actual designs',async()=>{
 assert.equal(new Set(profiles.map(p=>p.id)).size,204);
 for(const p of profiles){
  for(const word of p.names)assert.equal(classify(word).id,p.id);
  const res=await generate(p.id);assert.equal(res.status,'generated',p.id);
  assert.equal(res.kit.variants.length,3);assert.equal(res.kit.variants[0].document.creative.category,p.id);
 }
});
test('strict contract, unsafe SVG and complexity budgets',async()=>{
 for(const value of [null,{...spec,count:17},{...spec,slot:6,count:6},{...spec,seed:-1},{...spec,typo:2}])assert.throws(()=>options(value));
 assert.equal((await generate('Lion without a crown or unspecifiedgizmo')).status,'review_required');
 const doc=structuredClone((await generate('mountain')).kit.variants[0].document);
 doc.layers.at(-1).fontFamily='"><script>';assert.throws(()=>renderEditor(doc));
 assert.ok(similarity([regular(4,20)],[regular(4,20)])>.99);
});
test('real HTTP handler: auth, bounds, plan gate and generated editable documents',async t=>{
 let pending=false;
 const engine=createOrchestrator({interpret:async r=>({...r,brief:{name:'ORION'}}),plan:async r=>({...r,approved:!pending,review_required:pending,reasons:pending?['manual_review']:[]})});
 const gateway=createUserGateway({supabaseUrl:'https://test.invalid',publishableKey:'test',orchestrator:engine,fetchImpl:async()=>new Response(JSON.stringify({id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}))});
 const server=createLogoServer({token:'x'.repeat(40),userGateway:gateway});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());
 const send=(creative,token)=>fetch('http://127.0.0.1:'+server.address().port+'/v1/public/generate',{method:'POST',headers:{'content-type':'application/json',authorization:token?'Bearer '+token:''},body:JSON.stringify({prompt:'lion without crown',language:'en',creative})});
 assert.equal((await send(spec)).status,401);
 assert.equal((await send({...spec,count:120},'a'.repeat(32))).status,400);
 assert.equal((await (await send(spec,'a'.repeat(32))).json()).kit.variants.length,3);
 pending=true;assert.equal((await (await send(spec,'a'.repeat(32))).json()).status,'review_required');
});

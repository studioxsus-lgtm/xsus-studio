import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCoreClient} from './core-client.mjs';
import {createOrchestrator} from './orchestrator.mjs';
const env=process.env;
const interpret=createCoreClient({url:env.XSUS_LOGO_INTERPRET_URL,token:env.XSUS_LOGO_INTERPRET_TOKEN,operation:'logo.interpret',timeout:30000});
const plan=createCoreClient({url:env.XSUS_LOGO_PLAN_URL,token:env.XSUS_LOGO_PLAN_TOKEN,operation:'logo.plan',timeout:30000});
const engine=createOrchestrator({interpret,plan});
for(const [language,prompt] of [['en','Modern technology logo for "Nova" blue white'],['sq','Logo moderne teknologjike për "Nova" blu bardhë'],['fr','Logo moderne technologie pour «Nova» bleu blanc']]){
 const requestId=randomUUID();
 const result=await engine.generate({language,prompt,requestId});
 assert.equal(result.requestId,requestId);
 assert.equal(result.status,'generated');
 assert.ok(result.kit.variants.length>=3);
 assert.ok(result.kit.variants.every(v=>v.svg.startsWith('<svg')));
 console.log('PASS: triple-core generation '+language);
}
const review=await engine.generate({language:'en',prompt:'Modern logo',requestId:randomUUID()});
assert.equal(review.status,'review_required');
const contrast=await engine.generate({language:'en',prompt:'Modern logo for "Nova" white black',requestId:randomUUID()});
assert.equal(contrast.status,'generated');
console.log('PASS: clarification gate and palette generation');
const axion=await engine.generate({language:'en',requestId:randomUUID(),
 prompt:'Create a logo for "AXION". Combine the letter A with a neural network and circuit branches. Electric blue and violet.'});
assert.equal(axion.status,'generated');
assert.ok(axion.kit.variants.some(v=>v.document.layers.some(l=>l.type==='path')));
assert.ok(axion.kit.variants.some(v=>v.document.layers.some(l=>l.type==='circle')));
assert.ok(axion.kit.variants.every(v=>v.document.layers.some(l=>l.type==='text' && l.text.toUpperCase()==='AXION')));
console.log('PASS: AXION editable neural and circuit monograms through both core services');

const wordmark=await engine.generate({language:'en',requestId:randomUUID(),prompt:"Pair each symbol with the word AXION in bold, modern sans-serif lettering. Keep the background transparent. The symbol should remain recognizable as a mobile app icon, and the full logo should work on websites and business cards. Keep the symbol and wordmark on separate editable vector layers."});
assert.equal(wordmark.status,'generated');
assert.equal(wordmark.kit.name,'AXION');
console.log('PASS: unquoted AXION wordmark from public studio brief');
const roaster=await engine.generate({language:'en',requestId:randomUUID(),
 prompt:'Modern coffee logo for "VELORA" black white with an espresso cup.'});
assert.equal(roaster.status,'generated');
assert.ok(roaster.kit.variants.some(v=>v.symbol==='espresso-cup' && v.svg.includes('<path')));
console.log('PASS: editable coffee concepts through both core services');

for(const language of ['sq','en']){
 const velora=await engine.generate({language,requestId:randomUUID(),prompt:"Krijo tri variante logoje për markën e kafesë \"VELORA\". Përdor të zezë dhe të bardhë. Vendose emrin poshtë simbolit dhe ruaji simbolin dhe tekstin në shtresa të veçanta."});
 assert.equal(velora.status,'generated');
 assert.equal(velora.kit.name,'VELORA');
 assert.deepEqual(velora.kit.variants.map(v=>v.symbol),['split-bean','espresso-cup','pour-over']);
 console.log('PASS: Albanian VELORA coffee brief with UI language '+language);
}

const musicBrand=await engine.generate({language:'sq',requestId:randomUUID(),
 prompt:'Krijo tri variante logoje për studion e muzikës "ARIA". Përdor të zezë dhe të bardhë.'});
assert.equal(musicBrand.status,'generated');
assert.equal(musicBrand.kit.variants.length,3);
assert.ok(musicBrand.kit.variants.every(v=>['beam-notes','sound-bars','record','tuning-fork'].includes(v.symbol)));
console.log('PASS: Albanian music studio through both core services');

const cameraBrief=await engine.generate({language:'sq',requestId:randomUUID(),
 prompt:'Krijo tri variante logoje për studion e fotografisë "LUMA". Përdor një aparat fotografik, të zezë dhe të bardhë.'});
assert.equal(cameraBrief.status,'generated');
assert.equal(cameraBrief.kit.variants[0].symbol,'camera');
console.log('PASS: LUMA photography brief prioritizes requested camera');

const catalogLogo=await engine.generate({language:'sq',requestId:randomUUID(),prompt:'Krijo një logo për "ORBITA" me një raketë. Përdor blu dhe të bardhë.'});
assert.equal(catalogLogo.status,'generated');
assert.equal(catalogLogo.kit.variants[0].symbol,'catalog-rocket-1');
console.log('PASS: Albanian rocket brief through both cores');
for(const [language,prompt] of [
 ['en','Create a luxury logo for "ORION" with a lion but without a crown, using black and gold.'],
 ['sq','Krijo një logo për "DRITA" me një libër dhe llambë. Përdor blu dhe të bardhë.'],
 ['fr','Logo pour « ALPES » avec montagne, soleil et rivière en bleu et blanc.']
]){
 const res=await engine.generate({language,prompt,requestId:randomUUID(),creative:{version:'2.0.0',count:6,seed:724}});
 assert.equal(res.status,'generated');assert.equal(res.kit.version,'2.0.0');
 assert.equal(res.kit.variants.length,6);
 for(const v of res.kit.variants){assert.equal(v.document.creative.seed,724);assert.match(v.svg,/<path /)}
 if(language==='en')assert.deepEqual(res.kit.variants[0].document.creative.subjects,['lion']);
 console.log('PASS: V2 integrated Future interpretation, Hyper approval and vector generation '+language);
}
for(const [language,prompt] of [
 ['en','Create a geometric logo for "ORION" with a lion but without a crown.'],
 ['sq','Krijo një logo për "DRITA" me një libër dhe llambë.'],
 ['fr','Logo pour « ALPES » avec montagne, soleil et rivière.']
]){
 const result=await engine.generate({language,prompt,requestId:randomUUID(),creative:{version:'2.0.0',count:3,seed:271},graphic:{styles:['luxury','minimalist'],width:800,height:450,finish:'metallic',font:'alegreya'}});
 assert.equal(result.status,'generated');assert.equal(result.kit.version,'3.0.0');
 for(const v of result.kit.variants){assert.ok(v.svg.includes('<linearGradient'));assert.ok(v.document.layers.find(l=>l.id==='brand-name').outline.length)}
 console.log('PASS: V3 through both independent core services '+language);
}
const {projectAction}=await import('./intelligence-v4/project.mjs');
for(const [language,instruction] of [['en','Make the symbol red'],['fr','Rends le symbole rouge'],['sq','Bëje simbolin të kuq']]){
 const row={id:randomUUID(),revision:1,name:'AXION',document:axion.kit.variants[0].document};
 const input={version:'4.0.0',action:'preview',revision:1,projectId:row.id,requestId:randomUUID(),language,instruction,selected:row.document.layers.find(l=>l.type!=='text').id};
 const preview=await projectAction(row,input,engine.editPlan);
 assert.equal(preview.result.after.layers.find(l=>l.id===input.selected).fill,'#c73543');
 const applied=await projectAction(row,{...input,action:'apply',approval:preview.result.approval},engine.editPlan);
 assert.equal(applied.document.intelligence.cursor,1);
 console.log('PASS: V4 actual core approval, selective vector execution and reversible change '+language);
}

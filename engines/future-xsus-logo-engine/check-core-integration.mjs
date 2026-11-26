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

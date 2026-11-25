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

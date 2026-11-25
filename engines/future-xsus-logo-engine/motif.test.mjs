import test from 'node:test';
import assert from 'node:assert/strict';
import {readMotif} from './motif.mjs';
import {createOrchestrator} from './orchestrator.mjs';
const run=(prompt,name,reason)=>{
  const envelope={version:'1.0.0',requestId:'demo'};
  const brief={name,primary:'#2563eb',secondary:'#7c3aed'};
  const engine=createOrchestrator({
    interpret:async()=>({...envelope,brief}),
    plan:async({brief:b})=>{const reasons=b.secondary===brief.secondary && reason?[reason]:[];
      return {...envelope,...b,reasons,approved:!reasons.length,review_required:!!reasons.length}}
  });
  return engine.generate({prompt,requestId:'demo'});
};
test('AXION keeps both inks and produces editable monogram, aperture and circuit',async()=>{
  const r=await run('Combine the letter A with an abstract neural network and circuit branches','AXION','low_palette_contrast');
  assert.equal(r.status,'generated');
  const [nodes,cutout,traces]=r.kit.variants;
  assert.ok(nodes.document.layers.some(l=>l.type==='circle' && l.fill==='#7c3aed'));
  assert.match(cutout.svg,/<path /);
  assert.notEqual(nodes.svg,traces.svg);
  for(const v of r.kit.variants)assert.equal(v.document.layers.at(-1).text,'AXION');
});
test('explicit letters in Albanian and French override the brand initial',async()=>{
  for(const prompt of ['Përdor shkronjën K me rrjet nervor','Combine la lettre K et un réseau neuronal']){
    const r=await run(prompt,'Orion');
    assert.ok(r.kit.variants.every(v=>v.document.layers.some(l=>l.type==='text' && l.text==='K')));
  }
});
test('simple briefs and unrelated reviews retain their existing outcomes',async()=>{
  assert.equal(readMotif('Modern blue logo for "Nova"','Nova'),null);
  assert.equal((await run('Modern blue logo','Nova')).kit.variants[0].symbol,'star');
  assert.equal((await run('letter A and circuits','Axion','invalid_brand_text')).status,'review_required');
});

test('quoted wordmark reaches the interpreter only for unambiguous explicit names',async()=>{
  for(const [prompt,expected] of [
    ['Use the word AXION in bold','Use the word "AXION" in bold'],
    ['Écrire le mot ORION en bleu','Écrire le mot "ORION" en bleu'],
    ['Përdor fjalën ARTA me blu','Përdor fjalën "ARTA" me blu'],
    ['Use the word AXION in bold or the word ORION in blue',null],
    ['Create a modern logo',null],['Use the word AXION Labs in blue',null]
  ]){
    const engine=createOrchestrator({interpret:async req=>{
      assert.equal(req.prompt,expected??prompt);
      return {...req,brief:{name:''},clarification_required:true};
    },plan:()=>assert.fail('missing brand should request clarification')});
    assert.equal((await engine.generate({prompt,requestId:'demo'})).status,'review_required');
  }
});

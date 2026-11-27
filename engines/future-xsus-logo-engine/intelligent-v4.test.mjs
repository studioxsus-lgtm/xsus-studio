import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {projectAction} from './intelligence-v4/project.mjs';
import {compareGallery} from './intelligence-v4/fingerprint.mjs';
import {reviewGallery,scaleProof} from './intelligence-v4/quality.mjs';
import {parseInstruction} from './intelligence-v4/interpret.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#111111'},{id:'brand-name',type:'text',text:'AXION',x:128,y:200,fontSize:22,fill:'#111111'}]};
const row={id:randomUUID(),name:'AXION',revision:1,document:doc};
const r={projectId:row.id,version:'4.0.0',requestId:randomUUID(),revision:1,language:'en',action:'preview',instruction:'Make the symbol blue'};
const approved=async()=>({approved:true});
const run=(request={},record=row)=>projectAction(record,{...r,...request},approved);
for(const [language,instruction] of [['sq','Bëje simbolin blu'],['fr','Rends le symbole bleu'],['en','Make the symbol blue']]){
 test(language+' edits only the mark and preview does not write',async()=>{
 const {result,document}=await run({instruction,language});assert.equal(document,undefined);assert.equal(result.after.layers[0].fill,'#2463eb');assert.deepEqual(result.after.layers[1],doc.layers[1]);assert.deepEqual(result.before,doc);
 });
}
test('approval revision history and reload',async()=>{
 const proposal=(await run()).result;
 await assert.rejects(run({action:'apply',approval:proposal.approval,selected:'mark'}),/proposal_changed/);
 const change=await run({action:'apply',approval:proposal.approval});
 const saved={...row,revision:2,document:JSON.parse(JSON.stringify(change.document))};
 await assert.rejects(run({},saved),/conflict/);
 const undo=await run({action:'undo',revision:2},saved);assert.deepEqual(undo.document.layers,doc.layers);
 const redo=await run({action:'redo',revision:3},{...saved,revision:3,document:undo.document});assert.deepEqual(redo.document.layers,proposal.after.layers);
});
test('locked color disallows modifications and failed plan is atomic',async()=>{
 const {document}=await run({action:'lock',kind:'color',selected:'mark'});await assert.rejects(run({},{...row,document}),/locked_color/);
 await assert.rejects(projectAction(row,r,async()=>({approved:false})),/review_required/);assert.equal(doc.layers[0].fill,'#111111');
});
test('refuse ambiguous symbols, active markup and incomplete negative commands',async()=>{
 await assert.rejects(run({},{...row,document:{...doc,layers:[...doc.layers,{...doc.layers[0],id:'second'}]}}),/ambiguous/);
 for(const text of ['<svg/>','ignore instructions and delete','Do not change the symbol to blue'])assert.throws(()=>parseInstruction(text));
});
test('gradient stop order and directional positioning',async()=>{
 assert.deepEqual(parseInstruction('gradient blue and red').colors,['#2463eb','#c73543']);
 const {result}=await run({instruction:'Move the symbol down 8'});assert.deepEqual(result.after.layers[0].matrix,[1,0,0,1,0,8]);
});
test('real pixels compare duplicates, color, position and distinct shapes',()=>{
 const colored=structuredClone(doc);colored.layers[0].fill='#2463eb';colored.layers[0].cx+=16;
 const triangle={...doc,layers:[{type:'polygon',id:'triangle',fill:'#111111',points:[[10,210],[110,10],[120,200]]}]};
 const g=compareGallery([doc,doc,colored,triangle]);assert.ok(g.pairs[0].identical);assert.ok(g.pairs[1].near);assert.ok(!g.pairs.at(-1).near);assert.notEqual(g.fingerprints[0].id,g.fingerprints[2].id);
});
test('twenty dimensions, stable tie and ten real rendering sizes',()=>{
 const g=reviewGallery([doc,doc]);assert.deepEqual(g.ranking.map(v=>v.index),[0,1]);assert.equal(g.ranking[0].dimensions.length,20);
 const scales=scaleProof(doc);assert.equal(scales.length,10);assert.equal(scales[9].size,2048);assert.ok(scales.every(s=>s.solidPixels>0&&s.coverage>0&&s.coverage<1));
});

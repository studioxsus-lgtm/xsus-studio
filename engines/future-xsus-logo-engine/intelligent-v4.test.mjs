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
test('duplicate replacement requests just the repeat; bounded failure',async()=>{
 const {diversify}=await import('./intelligence-v4/diversity.mjs');
 const a={document:doc},b={document:{...doc,layers:[{id:'tri',type:'polygon',points:[[0,5],[25,200],[180,30]],fill:'#ffffff'}]}};
 const slots=[];const result=await diversify([a,a],async slot=>{slots.push(slot);return b});assert.deepEqual(result,[a,b]);assert.deepEqual(slots,[1]);
 let attempts=0;assert.equal(await diversify([a,a],async()=>{attempts++;return a}),null);assert.equal(attempts,6);
});
test('archives and reports survive serialization; clearing history requires confirmation',async()=>{
 const {document}=await run({action:'archive'});assert.deepEqual(document.intelligence.archives[0].document,doc);
 const report=await run({action:'report'},{...row,document});assert.equal(report.document.intelligence.analysis.ranking.length,1);assert.match(report.document.intelligence.analysis.fingerprints[0],/^[a-f0-9]{64}$/);
 await assert.rejects(run({action:'clearHistory'}),/confirmation_required/);
});
test('approval cannot edit another project or apply unverified improvements',async()=>{
 await assert.rejects(run({projectId:randomUUID()}),/project_conflict/);
 const bright=structuredClone(doc);bright.layers[0].fill='#fafafa';
 const {result}=await run({improve:true},{...row,document:bright});
 assert.notDeepEqual(result.before.layers,result.after.layers);assert.ok(result.verification.locksChecked);
});
test('reports clipping using actual transformed layer bounds',()=>{
 const shifted=structuredClone(doc);shifted.layers[0].matrix=[1,0,0,1,300,0];
 const report=reviewGallery([shifted]).ranking[0];assert.ok(report.issues.some(i=>i.code==='outside'&&i.dx<0));
});
test('revision retry is idempotent and low-alpha black loses contrast on white',async()=>{
 const first=(await run()).result,request={action:'apply',approval:first.approval};
 const applied=await run(request);const retry=await run(request,{...row,document:applied.document,revision:2});
 assert.equal(retry.result.revision,2);assert.equal(retry.document,undefined);
 const transparent=structuredClone(doc);transparent.layers[0].opacity=.01;
 assert.ok(reviewGallery([transparent]).ranking[0].issues.some(i=>i.code==='low_contrast'&&i.layer==='mark'));
});
test('checked owner and revision are forwarded on PostgREST writes, concurrent miss returns conflict',async()=>{
 const {editProject}=await import('./intelligence-v4/gateway.mjs');const calls=[];
 const result=await editProject({url:'https://example.com',headers:{Authorization:'Bearer fixture'},owner:'test-owner',input:{...r,action:'prefer'},fetchImpl:async(url,opts)=>{
 calls.push([url.toString(),opts]);return Response.json(opts.method==='PATCH'?[]:[row]);
 }});
 assert.equal(result.status,409);assert.equal(calls.length,2);for(const [url] of calls)assert.equal(new URL(url).searchParams.get('owner_id'),'eq.test-owner');
 assert.equal(new URL(calls[1][0]).searchParams.get('revision'),'eq.1');
});

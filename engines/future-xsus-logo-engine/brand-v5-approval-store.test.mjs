import test from 'node:test';import assert from 'node:assert/strict';import {createBrandApprovalStore} from './brand-v5/approval-store.mjs';
const doc={version:'1.0.0',width:256,height:256,layers:[{id:'mark',type:'circle',cx:128,cy:100,r:54,fill:'#112233'}]};
const interpret=async r=>({version:r.version,requestId:r.requestId,intent:{action:'mockup',name:'AXION',language:r.language}}),plan=async r=>({version:r.version,requestId:r.requestId,digest:r.digest,approved:true,review_required:false});
const input={owner:'owner-a',projectId:'project-a',doc,revision:1,prompt:'mockup',language:'en'};
test('approval is owner and project bound and single use',async()=>{const s=createBrandApprovalStore({interpret,plan}),d=await s.prepare(input),x={...input,approvalId:d.approvalId};await assert.rejects(s.execute({...x,owner:'owner-b'}));await assert.rejects(s.execute({...x,projectId:'project-b'}));assert.equal((await s.execute(x)).mime,'image/svg+xml');await assert.rejects(s.execute(x));});
test('expired approval rejected',async()=>{let now=0;const s=createBrandApprovalStore({interpret,plan,ttl:1000,clock:()=>now}),d=await s.prepare(input);now=1000;await assert.rejects(s.execute({...input,approvalId:d.approvalId}));});
test('stale revision rejected',async()=>{const s=createBrandApprovalStore({interpret,plan}),d=await s.prepare(input);await assert.rejects(s.execute({...input,revision:2,approvalId:d.approvalId}));});
test('review does not issue approval',async()=>{const s=createBrandApprovalStore({interpret,plan:async r=>({...await plan(r),review_required:true})});assert.equal((await s.prepare(input)).approvalId,undefined);});
test('capacity bounded',async()=>{const s=createBrandApprovalStore({interpret,plan,max:1});await s.prepare(input);await assert.rejects(s.prepare(input));});

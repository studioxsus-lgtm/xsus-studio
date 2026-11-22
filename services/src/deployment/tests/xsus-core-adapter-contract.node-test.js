import test from 'node:test';
import assert from 'node:assert/strict';
import {createXsUsCorePlanningAdapters,normalizeXsUsCorePlan} from '../xsus-core-adapter-contract.js';
test('explicit Future then Hyper adapters produce a planning-only contract',async()=>{
 const calls=[];
 const adapter=createXsUsCorePlanningAdapters({
  future:{normalizeGoal:async ({goal})=>{calls.push('future');return {goal:goal.trim()};}},
  hyper:{planApplication:async ({goal})=>{calls.push('hyper');return {contractVersion:'1.0.0',goal,steps:['Design UI']};}}
 });
 const result=await adapter.plan('Task manager');
 assert.deepEqual(calls,['future','hyper']);
 assert.equal(result.status,'planning-only');
 assert.equal(result.executable,false);
 assert.equal(result.steps[0],'Design UI');
});
test('missing adapters fail closed without pretending to run cores',async()=>{
 assert.equal(await createXsUsCorePlanningAdapters().plan('Task manager'),null);
});
test('invalid plans and executable-looking inputs are rejected',()=>{
 assert.equal(normalizeXsUsCorePlan({contractVersion:'1.0.0',goal:'Test',steps:['x'.repeat(241)]}),null);
 assert.equal(normalizeXsUsCorePlan({contractVersion:'2.0.0',goal:'Test',steps:[]}),null);
});

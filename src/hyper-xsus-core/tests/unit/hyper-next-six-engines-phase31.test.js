import {describe,it,expect} from "vitest";
import {verifyClaim} from "../../next-engines/truth-verification/index.js";
import {proposeLearning} from "../../next-engines/learning/index.js";
import {createPlan} from "../../next-engines/strategic-planning/index.js";
import {evaluateExecutionReadiness} from "../../next-engines/autonomous-execution/index.js";
import {analyzeImprovement} from "../../next-engines/self-improvement/index.js";
import {dispatchAgents} from "../../next-engines/multi-agent/index.js";
const req=(engineId,operation,payload)=>({contractVersion:"1.0.0",requestId:"audit31",engineId,operation,payload,
 context:{principalId:"tester",traceId:"trace31",authorizationRef:"policy:test"}});
describe("Hyper phase 31 — six engine capability and safety audit",()=>{
 it("truth verification never claims independent verification",()=>{
  const response=verifyClaim(req("truth-verification","truth.verifyClaim",{claim:"example",evidence:[{id:"e1",stance:"supports"}]}));
  expect(response.result).toMatchObject({verdict:"insufficient_evidence",independentlyVerified:false});
 });
 it("learning proposes but never persists or verifies candidate content",()=>{
  const response=proposeLearning(req("learning","learning.propose",{content:"candidate",sourceRef:"local:test"}));
  expect(response.result).toMatchObject({state:"proposed",verified:false,persisted:false,requiresVerification:true});
 });
 it("planning validates a draft without execution",()=>{
  const response=createPlan(req("strategic-planning","planning.create",{goal:"review",steps:[]}));
  expect(response.result).toMatchObject({state:"draft",executable:false,dependencyGraphValid:true});
 });
 it("execution readiness remains blocked even with all caller-supplied flags",()=>{
  const payload=Object.fromEntries(["sandboxVerified","approvalVerified","policyVerified","recoveryVerified","idempotencyVerified"].map(k=>[k,true]));
  const response=evaluateExecutionReadiness(req("autonomous-execution","execution.evaluateReadiness",payload));
  expect(response).toMatchObject({status:"rejected"});
  expect(response.result).toMatchObject({state:"blocked",claimedChecksPresent:true,verifiedByTrustedRuntime:false,sideEffects:false});
 });
 it("self-improvement does not apply changes",()=>{
  const response=analyzeImprovement(req("self-improvement","improvement.analyze",{baselineRef:"baseline"}));
  expect(response.result).toMatchObject({state:"pending_benchmark",changesApplied:false});
 });
 it("multi-agent dispatch remains blocked",()=>{
  const response=dispatchAgents(req("multi-agent","agents.dispatch",{}));
  expect(response).toMatchObject({status:"rejected"});
  expect(response.result).toMatchObject({state:"blocked",dispatched:0});
 });
});

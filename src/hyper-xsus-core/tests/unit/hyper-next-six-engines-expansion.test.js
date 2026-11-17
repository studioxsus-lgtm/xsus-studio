import {describe,it,expect} from "vitest";
import {truthVerification,learning,strategicPlanning,autonomousExecution,selfImprovement,multiAgent} from "../../next-engines/index.js";
function req(engineId,operation,payload){return {contractVersion:"1.0.0",requestId:"expansion-1",engineId,operation,payload,context:{principalId:"tester",traceId:"expansion-trace",authorizationRef:"policy:test"}};}
describe("Six engines expansion — secure functional regression",()=>{
  it("counts traceable evidence and distinct sources",()=>{
    const r=truthVerification.assessEvidenceQuality(req("truth-verification","truth.assessEvidenceQuality",{evidence:[{id:"a",sourceRef:"s1"},{id:"b",sourceRef:"s1"},{id:"c"}]}));
    expect(r.result).toMatchObject({traceable:2,missingSource:1,distinctSources:1,independentlyVerified:false});
  });
  it("rejects duplicate evidence IDs",()=>{
    expect(()=>truthVerification.assessEvidenceQuality(req("truth-verification","truth.assessEvidenceQuality",{evidence:[{id:"a"},{id:"a"}]}))).toThrow();
  });
  it("detects duplicate learning source references without persisting",()=>{
    const r=learning.evaluateLearningCandidate(req("learning","learning.evaluateCandidate",{content:"Candidate",sourceRefs:["s1","s1","s2"]}));
    expect(r.result).toMatchObject({sourceCount:2,duplicateSources:1,persisted:false,eligibleForCommit:false});
  });
  it("rejects malformed learning source references",()=>{
    expect(()=>learning.evaluateLearningCandidate(req("learning","learning.evaluateCandidate",{content:"Candidate",sourceRefs:[null]}))).toThrow();
  });
  it("produces topological plan order",()=>{
    const r=strategicPlanning.schedulePlan(req("strategic-planning","planning.schedule",{steps:[{id:"c",dependsOn:["b"]},{id:"b",dependsOn:["a"]},{id:"a",dependsOn:[]}]}));
    expect(r.result.orderedStepIds).toEqual(["a","b","c"]);expect(r.result.executable).toBe(false);
  });
  it("rejects a cycle in scheduling",()=>{
    expect(()=>strategicPlanning.schedulePlan(req("strategic-planning","planning.schedule",{steps:[{id:"a",dependsOn:["b"]},{id:"b",dependsOn:["a"]}]}))).toThrow();
  });
  it("rejects execution even when caller claims every safety check",()=>{
    const r=autonomousExecution.evaluateExecutionReadiness(req("autonomous-execution","execution.evaluateReadiness",{sandboxVerified:true,approvalVerified:true,policyVerified:true,recoveryVerified:true,idempotencyVerified:true}));
    expect(r.status).toBe("rejected");expect(r.result.verifiedByTrustedRuntime).toBe(false);
  });
  it("rejects raw execution scripts",()=>{
    expect(()=>autonomousExecution.evaluateExecutionReadiness(req("autonomous-execution","execution.evaluateReadiness",{script:"danger"}))).toThrow();
  });
  it("compares benchmark deltas without applying changes",()=>{
    const r=selfImprovement.compareBenchmarks(req("self-improvement","improvement.compareBenchmarks",{baseline:{accuracy:0.8,latency:100},candidate:{accuracy:0.9,latency:90}}));
    expect(r.result.deltas.accuracy).toBeCloseTo(0.1);expect(r.result.deltas.latency).toBe(-10);expect(r.result.changesApplied).toBe(false);
  });
  it("rejects nonfinite benchmark data",()=>{
    expect(()=>selfImprovement.compareBenchmarks(req("self-improvement","improvement.compareBenchmarks",{baseline:{a:Infinity},candidate:{a:1}}))).toThrow();
  });
  it("plans assignments without dispatching agents",()=>{
    const r=multiAgent.planAgentAssignments(req("multi-agent","agents.planAssignments",{agents:[{id:"agent-1"}],tasks:[{id:"t1",agentId:"agent-1"},{id:"t2",agentId:"missing"}]}));
    expect(r.result.dispatched).toBe(0);expect(r.result.unassignedCount).toBe(1);expect(r.result.delegationAuthorized).toBe(false);
  });
  it("rejects duplicate agent identities",()=>{
    expect(()=>multiAgent.planAgentAssignments(req("multi-agent","agents.planAssignments",{agents:[{id:"a"},{id:"a"}],tasks:[]}))).toThrow();
  });
});

import {describe,it,expect} from "vitest";
import {truthVerification,learning,strategicPlanning,autonomousExecution,selfImprovement,multiAgent} from "../../next-engines/index.js";
function req(engineId,operation,payload){return {contractVersion:"1.0.0",requestId:"boundary-1",engineId,operation,payload,context:{principalId:"tester",traceId:"boundary-trace",authorizationRef:"policy:test"}};}
describe("Hyper six engines — boundary and fail-closed checks",()=>{
  it("rejects duplicate evidence identifiers",()=>{
    expect(()=>truthVerification.verifyClaim(req("truth-verification","truth.verifyClaim",{claim:"A",evidence:[{id:"same"},{id:"same"}]}))).toThrow();
  });
  it("rejects malformed evidence objects",()=>{
    expect(()=>truthVerification.verifyClaim(req("truth-verification","truth.verifyClaim",{claim:"A",evidence:[null]}))).toThrow();
  });
  it("rejects oversized evidence sets",()=>{
    expect(()=>truthVerification.verifyClaim(req("truth-verification","truth.verifyClaim",{claim:"A",evidence:Array.from({length:101},(_,i)=>({id:String(i)}))}))).toThrow();
  });
  it("rejects oversized learning proposals",()=>{
    expect(()=>learning.proposeLearning(req("learning","learning.propose",{content:"a".repeat(10001),sourceRef:"source:1"}))).toThrow();
  });
  it("rejects oversized planning goals",()=>{
    expect(()=>strategicPlanning.createPlan(req("strategic-planning","planning.create",{goal:"a".repeat(4097)}))).toThrow();
  });
  it("rejects raw execution commands",()=>{
    expect(()=>autonomousExecution.prepareExecution(req("autonomous-execution","execution.prepare",{command:"echo test"}))).toThrow();
  });
  it("rejects oversized improvement baselines",()=>{
    expect(()=>selfImprovement.analyzeImprovement(req("self-improvement","improvement.analyze",{baselineRef:"a".repeat(513)}))).toThrow();
  });
  it("rejects unverified delegated authorization",()=>{
    expect(()=>multiAgent.dispatchAgents(req("multi-agent","agents.dispatch",{delegateAuthorization:"token"}))).toThrow();
  });
  it("preserves fail-closed execution status",()=>{
    const r=autonomousExecution.prepareExecution(req("autonomous-execution","execution.prepare",{}));
    expect(r.status).toBe("rejected");expect(r.result.sideEffects).toBe(false);
  });
  it("does not treat supplied evidence as independently verified",()=>{
    const r=truthVerification.verifyClaim(req("truth-verification","truth.verifyClaim",{claim:"A",evidence:[{id:"e1"}]}));
    expect(r.result.independentlyVerified).toBe(false);
  });
});

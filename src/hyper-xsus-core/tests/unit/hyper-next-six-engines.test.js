import {describe,it,expect} from "vitest";
import {truthVerification,learning,strategicPlanning,autonomousExecution,selfImprovement,multiAgent} from "../../next-engines/index.js";
const cases=[
  [truthVerification,"truth.verifyClaim",{claim:"Example",evidence:[]}],
  [learning,"learning.propose",{content:"Candidate",sourceRef:"source:1"}],
  [strategicPlanning,"planning.create",{goal:"Build a safe plan"}],
  [autonomousExecution,"execution.prepare",{}],
  [selfImprovement,"improvement.analyze",{baselineRef:"commit:1"}],
  [multiAgent,"agents.dispatch",{}]
];
function make(id,operation,payload){return {contractVersion:"1.0.0",requestId:"req-1",engineId:id,operation,payload,context:{principalId:"tester",traceId:"trace-1",authorizationRef:"policy:test"}};}
describe("Hyper XSUS Core six new engine foundations",()=>{
  it("has six distinct identifiers",()=>expect(new Set(cases.map(([engine])=>engine.ENGINE_ID)).size).toBe(6));
  it.each(cases.map(([engine,op,payload])=>[engine,op,payload]))("validates and responds: %s", (engine,op,payload)=>{
    const fn=Object.values(engine).find(value=>typeof value==="function");
    const response=fn(make(engine.ENGINE_ID,op,payload));
    expect(response.requestId).toBe("req-1");
    expect(response.metadata.traceId).toBe("trace-1");
  });
  it.each(cases.map(([engine,op,payload])=>[engine,op,payload]))("rejects wrong version: %s",(engine,op,payload)=>{
    const fn=Object.values(engine).find(value=>typeof value==="function");
    expect(()=>fn({...make(engine.ENGINE_ID,op,payload),contractVersion:"0.0.0"})).toThrow();
  });
  it("does not perform external execution",()=>{
    const r=autonomousExecution.prepareExecution(make(autonomousExecution.ENGINE_ID,"execution.prepare",{}));
    expect(r.status).toBe("rejected");expect(r.result.sideEffects).toBe(false);
  });
  it("does not claim evidence is verified",()=>{
    const r=truthVerification.verifyClaim(make(truthVerification.ENGINE_ID,"truth.verifyClaim",{claim:"X",evidence:[{id:"1"}]}));
    expect(r.result.independentlyVerified).toBe(false);
  });
});

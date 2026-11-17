import {describe,it,expect} from "vitest";
import {truthVerification,learning,strategicPlanning} from "../../next-engines/index.js";
function req(engineId,operation,payload){return {contractVersion:"1.0.0",requestId:"functional-1",engineId,operation,payload,context:{principalId:"tester",traceId:"functional-trace",authorizationRef:"policy:test"}};}
describe("Hyper six engines — functional foundations",()=>{
  it("reports conflicting stances without declaring truth",()=>{
    const r=truthVerification.verifyClaim(req("truth-verification","truth.verifyClaim",{claim:"Example",evidence:[{id:"a",stance:"supports"},{id:"b",stance:"opposes"}]}));
    expect(r.result.assessment.conflictingStances).toBe(true);
    expect(r.result.verdict).toBe("insufficient_evidence");
    expect(r.result.independentlyVerified).toBe(false);
  });
  it("rejects invalid evidence stance",()=>{
    expect(()=>truthVerification.verifyClaim(req("truth-verification","truth.verifyClaim",{claim:"Example",evidence:[{id:"a",stance:"verified"}]}))).toThrow();
  });
  it("produces learning proposal metadata without persistence",()=>{
    const r=learning.proposeLearning(req("learning","learning.propose",{content:"New   candidate",sourceRef:"source:1"}));
    expect(r.result.contentLength).toBe("New candidate".length);
    expect(r.result.persisted).toBe(false);
    expect(r.result.requiresVerification).toBe(true);
  });
  it("accepts valid dependency DAG as a non-executable draft",()=>{
    const r=strategicPlanning.createPlan(req("strategic-planning","planning.create",{goal:"Safe plan",steps:[{id:"a",task:"Analyze",dependsOn:[]},{id:"b",task:"Review",dependsOn:["a"]}]}));
    expect(r.result.steps).toHaveLength(2);
    expect(r.result.dependencyGraphValid).toBe(true);
    expect(r.result.executable).toBe(false);
  });
  it("rejects missing dependency",()=>{
    expect(()=>strategicPlanning.createPlan(req("strategic-planning","planning.create",{goal:"Plan",steps:[{id:"a",task:"Analyze",dependsOn:["missing"]}]}))).toThrow();
  });
  it("rejects cyclic dependencies",()=>{
    expect(()=>strategicPlanning.createPlan(req("strategic-planning","planning.create",{goal:"Plan",steps:[{id:"a",task:"Analyze",dependsOn:["b"]},{id:"b",task:"Review",dependsOn:["a"]}]}))).toThrow();
  });
  it("rejects duplicate step identifiers",()=>{
    expect(()=>strategicPlanning.createPlan(req("strategic-planning","planning.create",{goal:"Plan",steps:[{id:"a",task:"A",dependsOn:[]},{id:"a",task:"B",dependsOn:[]}]}))).toThrow();
  });
});

import {describe,it,expect} from "vitest";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
function req(inputs){return {contractVersion:"1.0.0",requestId:"orchestrate-1",engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs},context:{principalId:"tester",traceId:"trace-6",authorizationRef:"policy:test"}};}
describe("Six engine coordination — fail closed",()=>{
  it("coordinates six stages in deterministic order",()=>{
    const r=coordinateSixEngines(req({
      agents:{},improvement:{baselineRef:"baseline:1"},execution:{},planning:{goal:"Safe plan"},
      learning:{content:"Candidate",sourceRef:"source:1"},truth:{claim:"Example",evidence:[]}
    }));
    expect(r.result.stages.map(x=>x.stage)).toEqual(["truth","learning","planning","execution","improvement","agents"]);
    expect(r.result.completed).toBe(6);
    expect(r.result.rejected).toBe(2);
    expect(r.result.authorizedForExecution).toBe(false);
    expect(r.result.sideEffects).toBe(false);
  });
  it("propagates trace identity",()=>{
    const r=coordinateSixEngines(req({truth:{claim:"X",evidence:[]}}));
    expect(r.metadata.traceId).toBe("trace-6");
    expect(r.result.stages[0].status).toBe("success");
  });
  it("captures contract errors without leaking internal details",()=>{
    const r=coordinateSixEngines(req({learning:{content:"",sourceRef:"s"}}));
    expect(r.result.stages[0]).toMatchObject({status:"rejected",errorCode:"INVALID_INPUT"});
    expect(r.result.stages[0]).not.toHaveProperty("stack");
  });
  it("rejects unknown engine keys",()=>expect(()=>coordinateSixEngines(req({unknown:{}}))).toThrow());
  it("rejects invalid stage payloads",()=>expect(()=>coordinateSixEngines(req({truth:null}))).toThrow());
  it("rejects missing inputs",()=>{
    const request=req({});
    delete request.payload.inputs;
    expect(()=>coordinateSixEngines(request)).toThrow();
  });
  it("keeps empty coordination non-executable",()=>{
    const r=coordinateSixEngines(req({}));
    expect(r.result).toMatchObject({completed:0,authorizedForExecution:false,sideEffects:false});
  });
  it("does not trust execution readiness flags",()=>{
    const r=coordinateSixEngines(req({execution:{sandboxVerified:true,approvalVerified:true,policyVerified:true,recoveryVerified:true,idempotencyVerified:true}}));
    expect(r.result.stages[0].status).toBe("rejected");
    expect(r.result.stages[0].result.verifiedByTrustedRuntime).toBe(false);
  });
  it("does not dispatch agents",()=>{
    const r=coordinateSixEngines(req({agents:{}}));
    expect(r.result.stages[0].result.dispatched).toBe(0);
  });
  it("rejects wrong orchestration contract version",()=>{
    expect(()=>coordinateSixEngines({...req({}),contractVersion:"0.1.0"})).toThrow();
  });
});

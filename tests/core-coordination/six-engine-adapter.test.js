import {describe,it,expect,vi} from "vitest";
import {createHyperSixEngineAdapter,SIX_ENGINE_STAGE_NAMES} from "../../src/core-coordination/six-engine-adapter.js";
const options={contractVersion:"1.0.0",requestId:"req-1",principalId:"user-1"};
const safe={status:"success",result:{state:"review_required",authorizedForExecution:false,sideEffects:false,stages:[{stage:"truth",status:"completed",result:{verdict:"insufficient_evidence"}}]}};
describe("Phase 12.5.5 real Hyper six-engine orchestration adapter",()=>{
  it("exposes all six stages",()=>expect(SIX_ENGINE_STAGE_NAMES).toHaveLength(6));
  it("uses the real orchestration request envelope and strips stage internals",async()=>{
    const coordinateSixEngines=vi.fn(()=>safe);
    const adapter=createHyperSixEngineAdapter({...options,orchestration:{coordinateSixEngines}});
    const result=await adapter.reviewStages({inputs:{truth:{claim:"example",evidence:[]}}});
    expect(coordinateSixEngines).toHaveBeenCalledWith(expect.objectContaining({
      engineId:"six-engine-orchestration",operation:"orchestration.coordinate",
      payload:{inputs:{truth:{claim:"example",evidence:[]}}}
    }));
    expect(result).toEqual({status:"review_required",authorizedForExecution:false,sideEffects:false,stages:[{stage:"truth",status:"completed"}]});
  });
  it("blocks unsafe orchestration outputs",async()=>{
    const adapter=createHyperSixEngineAdapter({...options,orchestration:{coordinateSixEngines:()=>({...safe,result:{...safe.result,authorizedForExecution:true}})}});
    await expect(adapter.reviewStages({inputs:{truth:{}}})).rejects.toMatchObject({code:"invalid_orchestration_result"});
  });
  it("rejects unknown stages before invoking Hyper",async()=>{
    const coordinateSixEngines=vi.fn();
    const adapter=createHyperSixEngineAdapter({...options,orchestration:{coordinateSixEngines}});
    await expect(adapter.reviewStages({inputs:{unknown:{}}})).rejects.toMatchObject({code:"invalid_stage_inputs"});
    expect(coordinateSixEngines).not.toHaveBeenCalled();
  });
});

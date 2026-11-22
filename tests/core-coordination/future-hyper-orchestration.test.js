import {describe,it,expect,vi} from "vitest";
import {createFutureHyperOrchestration} from "../../src/core-coordination/future-hyper-orchestration.js";
const ok = {language:"en",text:"Reviewed goal",status:"unchanged",review_required:false};
const hyperResult = {status:"success",result:{state:"review_required",authorizedForExecution:false,sideEffects:false,stages:[{stage:"truth",status:"success"}]}};
const make = (language=ok) => {
  const fetchImpl=vi.fn(async()=>({ok:true,text:async()=>JSON.stringify(language)}));
  const coordinateSixEngines=vi.fn(()=>hyperResult);
  const integration=createFutureHyperOrchestration({token:"session-token",fetchImpl,orchestration:{coordinateSixEngines},contractVersion:"1.0.0",requestId:"req-1",principalId:"user-1"});
  return {integration,fetchImpl,coordinateSixEngines};
};
describe("Phase 12.5.6 Future + six Hyper engine orchestration",()=>{
  it("coordinates language review and orchestration without execution",async()=>{
    const {integration,coordinateSixEngines}=make();
    const result=await integration.review({goal:"Build app",inputs:{truth:{claim:"example",evidence:[]}}});
    expect(result.status).toBe("review_required");
    expect(result.safety).toEqual({executable:false,sideEffects:false});
    expect(coordinateSixEngines).toHaveBeenCalledOnce();
  });
  it("does not call Hyper when Future requires review",async()=>{
    const {integration,coordinateSixEngines}=make({...ok,status:"partial",review_required:true});
    await expect(integration.review({goal:"Build app",inputs:{truth:{claim:"example",evidence:[]}}})).rejects.toMatchObject({code:"language_review_required"});
    expect(coordinateSixEngines).not.toHaveBeenCalled();
  });
  it("rejects empty goal before Future network request",async()=>{
    const {integration,fetchImpl}=make();
    await expect(integration.review({goal:"",inputs:{truth:{}}})).rejects.toMatchObject({code:"invalid_request"});
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

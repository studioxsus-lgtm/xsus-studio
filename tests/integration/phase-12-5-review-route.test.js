import {describe,it,expect,vi} from "vitest";
import {createHyperFutureReviewRoute,HYPER_FUTURE_REVIEW_PATH} from "../../src/platform/xsus-app/hyper-future-review-route.js";
const language={language:"en",text:"Validated request",status:"corrected",review_required:false};
const result={status:"success",result:{state:"review_required",authorizedForExecution:false,sideEffects:false,stages:[{stage:"truth",engineId:"truth-verification",status:"success",result:{verdict:"insufficient_evidence"}}]}};
const payload={goal:"Verify claim",inputs:{truth:{claim:"example",evidence:[]}}};
function setup(overrides={}) {
  const verifyUser=vi.fn(async()=>({userId:"user-1",token:"private-token"}));
  const fetchImpl=vi.fn(async()=>({ok:true,text:async()=>JSON.stringify(language)}));
  const coordinateSixEngines=vi.fn(()=>result);
  return {verifyUser,fetchImpl,coordinateSixEngines,route:createHyperFutureReviewRoute({
    verifyUser,fetchImpl,makeRequestId:()=>"req-1",
    hyperOrchestration:{coordinateSixEngines},...overrides
  })};
}
describe("Phase 12.5.8 authenticated six-engine review HTTP handler",()=>{
  it("has a dedicated non-executing route",()=>{
    expect(HYPER_FUTURE_REVIEW_PATH).toBe("/api/xsus-app/hyper-future/review");
  });
  it("calls Future and Hyper with authenticated principal, strips private stage output",async()=>{
    const {route,fetchImpl,coordinateSixEngines}=setup();
    const response=await route.handle({authorization:"Bearer user-token",body:payload});
    expect(response.status).toBe(200);
    expect(response.data.safety).toEqual({executable:false,sideEffects:false});
    expect(response.data.orchestration.stages).toEqual([{stage:"truth",status:"success"}]);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(coordinateSixEngines.mock.calls[0][0]).toMatchObject({
      operation:"orchestration.coordinate",
      context:{principalId:"user-1",authorizationRef:"supabase-user-session"}
    });
    expect(JSON.stringify(response.data)).not.toContain("private-token");
  });
  it("requires authentication before any engine call",async()=>{
    const {route,fetchImpl}=setup();
    expect((await route.handle({body:payload})).status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("blocks unexpected engine stages",async()=>{
    const {route,fetchImpl}=setup();
    const response=await route.handle({authorization:"Bearer x",body:{goal:"Example",inputs:{unknown:{}}}});
    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("does not call Hyper when Future requires review",async()=>{
    const {route,coordinateSixEngines}=setup({fetchImpl:async()=>({ok:true,text:async()=>JSON.stringify({...language,status:"partial",review_required:true})})});
    expect((await route.handle({authorization:"Bearer x",body:payload})).status).toBe(422);
    expect(coordinateSixEngines).not.toHaveBeenCalled();
  });
  it("fails closed when Hyper response permits execution",async()=>{
    const {route}=setup({hyperOrchestration:{coordinateSixEngines:()=>({...result,result:{...result.result,authorizedForExecution:true}})}});
    const response=await route.handle({authorization:"Bearer x",body:payload});
    expect(response.status).toBe(422);
  });
  it("rejects oversized stage input before network access",async()=>{
    const {route,fetchImpl}=setup();
    const response=await route.handle({authorization:"Bearer x",body:{goal:"Example",inputs:{truth:{claim:"x".repeat(17000)}}}});
    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

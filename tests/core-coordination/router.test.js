import {describe,it,expect,vi} from "vitest";
import {createCoordinationRouter,CAPABILITIES} from "../../src/core-coordination/router.js";
const language = {core:"future-xsus-core",text:"Validated goal",status:"corrected",review_required:false};
const plan = {core:"hyper-xsus-core",state:"draft",executable:false,dependencyGraphValid:true,steps:[{id:"s1",task:"Plan only",dependsOn:[]}]};
function setup(futureResult=language,hyperResult=plan,opts={}) {
  const future={reviewLanguage:vi.fn(async()=>futureResult)};
  const hyper={createDraftPlan:vi.fn(async()=>hyperResult)};
  return {future,hyper,router:createCoordinationRouter({future,hyper,...opts})};
}
describe("Phase 12.5.2 capability routing",()=>{
  it("exposes explicit capability mapping",()=>expect(Object.keys(CAPABILITIES)).toEqual(["application.plan","language.review"]));
  it("routes a validated language result without Hyper",async()=>{
    const {router,hyper}=setup();
    const result=await router.dispatch({operation:"language.review",goal:"Input"});
    expect(result.language.text).toBe("Validated goal");
    expect(hyper.createDraftPlan).not.toHaveBeenCalled();
  });
  it("passes only validated goal to Hyper and returns safe draft",async()=>{
    const {router,hyper}=setup();
    const result=await router.dispatch({operation:"application.plan",goal:"Input"});
    expect(hyper.createDraftPlan).toHaveBeenCalledWith({goal:"Validated goal",signal:expect.any(AbortSignal)});
    expect(result.safety).toEqual({executable:false,sideEffects:false});
  });
  it("rejects unsupported operations before contacting either engine",async()=>{
    const {router,future,hyper}=setup();
    await expect(router.dispatch({operation:"system.execute",goal:"Input"})).rejects.toMatchObject({code:"unsupported_operation"});
    expect(future.reviewLanguage).not.toHaveBeenCalled();
    expect(hyper.createDraftPlan).not.toHaveBeenCalled();
  });
  it("fails closed on language review and never calls Hyper",async()=>{
    const {router,hyper}=setup({...language,review_required:true});
    await expect(router.dispatch({operation:"application.plan",goal:"Input"})).rejects.toMatchObject({code:"language_review_required"});
    expect(hyper.createDraftPlan).not.toHaveBeenCalled();
  });
  it("does not leak internal adapter exceptions",async()=>{
    const {router}=setup();
    const broken=createCoordinationRouter({future:{reviewLanguage:async()=>{throw new Error("private internal details");}},hyper:{createDraftPlan:async()=>plan}});
    await expect(broken.dispatch({operation:"application.plan",goal:"Input"})).rejects.toMatchObject({code:"engine_unavailable",message:"engine_unavailable"});
    expect(router).toBeDefined();
  });
  it("rejects invalid adapter configurations and timeouts",()=>{
    expect(()=>createCoordinationRouter()).toThrow();
    expect(()=>setup(language,plan,{timeoutMs:0})).toThrow();
  });
  it("rejects an already aborted request without invoking engines",async()=>{
    const {router,future}=setup(), controller=new AbortController();controller.abort();
    await expect(router.dispatch({operation:"application.plan",goal:"Input",signal:controller.signal})).rejects.toMatchObject({code:"aborted"});
    expect(future.reviewLanguage).not.toHaveBeenCalled();
  });
  it("times out an unresponsive Future adapter without calling Hyper",async()=>{
    const future={reviewLanguage:()=>new Promise(()=>{})};
    const hyper={createDraftPlan:vi.fn()};
    const router=createCoordinationRouter({future,hyper,timeoutMs:5});
    await expect(router.dispatch({operation:"application.plan",goal:"Input"})).rejects.toMatchObject({code:"engine_timeout"});
    expect(hyper.createDraftPlan).not.toHaveBeenCalled();
  });
});

import {describe,it,expect,vi} from "vitest";
import {createCoordinationRouter} from "../../src/core-coordination/router.js";
import {createFutureHttpAdapter,createHyperPlanningAdapter} from "../../src/core-coordination/real-adapters.js";
const steps=[{id:"step-1",task:"Design interface",dependsOn:[]}];
const makeResponse = data => ({ok:true,text:async()=>JSON.stringify(data)});
const language={language:"en",text:"Build an application",status:"unchanged",review_required:false};
describe("Phase 12.5.3 real engine adapter signatures",()=>{
  it("sends Future proofread contract and forwards verified text to Hyper",async()=>{
    const fetchImpl=vi.fn(async()=>makeResponse(language));
    const createPlan=vi.fn(async()=>({result:{state:"draft",executable:false,dependencyGraphValid:true,steps}}));
    const future=createFutureHttpAdapter({token:"test-session",fetchImpl});
    const hyper=createHyperPlanningAdapter({strategicPlanning:{createPlan},contractVersion:"1.0.0",requestId:"request-1",principalId:"user-1",steps});
    const router=createCoordinationRouter({future,hyper});
    const result=await router.dispatch({operation:"application.plan",goal:"Build app"});
    expect(fetchImpl.mock.calls[0][0]).toBe("https://future-xsus-core-api.onrender.com/v1/language/proofread");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({text:"Build app",language:"en"});
    expect(createPlan.mock.calls[0][0]).toMatchObject({operation:"planning.create",payload:{goal:"Build an application",steps}});
    expect(result.plan.executable).toBe(false);
  });
  it("does not invoke Hyper when Future returns partial review",async()=>{
    const fetchImpl=vi.fn(async()=>makeResponse({...language,status:"partial",review_required:true}));
    const createPlan=vi.fn();
    const router=createCoordinationRouter({
      future:createFutureHttpAdapter({token:"test-session",fetchImpl}),
      hyper:createHyperPlanningAdapter({strategicPlanning:{createPlan},contractVersion:"1.0.0",requestId:"request-1",principalId:"user-1",steps})
    });
    await expect(router.dispatch({operation:"application.plan",goal:"Build app"})).rejects.toMatchObject({code:"language_review_required"});
    expect(createPlan).not.toHaveBeenCalled();
  });
  it("rejects untrusted Future origins",()=>{
    expect(()=>createFutureHttpAdapter({token:"test-session",origin:"https://example.com"})).toThrow();
  });
});

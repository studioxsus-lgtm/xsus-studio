import {describe,it,expect,vi} from "vitest";
import {createHyperFutureBridge,HYPER_FUTURE_BRIDGE_PATH} from "../../src/platform/xsus-app/hyper-future-bridge.js";
const steps=[{id:"s1",task:"Design UI",dependsOn:[]},{id:"s2",task:"Review",dependsOn:["s1"]}];
const verifyUser=vi.fn(async()=>({userId:"test-user",token:"test-session"}));
const mockFuture=(data={language:"en",text:"Build a safe app",status:"unchanged",review_required:false})=>
  vi.fn(async()=>({ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(data)}));
const bridge=fetchImpl=>createHyperFutureBridge({verifyUser,fetchImpl,makeRequestId:()=> "request-test-1"});
describe("Phase 12.5 live Hyper planning engine + Future HTTP contract (mock transport)",()=>{
  it("calls real Hyper strategicPlanning after Future proofread",async()=>{
    const fetchImpl=mockFuture();
    const result=await bridge(fetchImpl).handle({authorization:"Bearer test-session",body:{goal:"Build app",steps}});
    expect(HYPER_FUTURE_BRIDGE_PATH).toBe("/api/xsus-app/hyper-future/plan");
    expect(result.status).toBe(200);
    expect(result.data.status).toBe("completed");
    expect(result.data.plan.core).toBe("hyper-xsus-core");
    expect(result.data.plan.state).toBe("draft");
    expect(result.data.plan.executable).toBe(false);
    expect(result.data.plan.steps).toHaveLength(2);
    expect(result.data.safety).toEqual({executable:false,sideEffects:false});
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({text:"Build app",language:"en"});
  });
  it("never invokes Hyper when Future requires review",async()=>{
    const result=await bridge(mockFuture({language:"en",text:"Review goal",status:"partial",review_required:true}))
      .handle({authorization:"Bearer test-session",body:{goal:"Build app",steps}});
    expect(result.status).toBe(200);
    expect(result.data.status).toBe("review_required");
    expect(result.data.plan).toBeNull();
  });
  it("rejects unauthorized requests before contacting Future",async()=>{
    const fetchImpl=mockFuture();
    const result=await bridge(fetchImpl).handle({authorization:"",body:{goal:"Build app",steps}});
    expect(result.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects cyclic plan through real Hyper engine",async()=>{
    const cyclic=[{id:"a",task:"A",dependsOn:["b"]},{id:"b",task:"B",dependsOn:["a"]}];
    const result=await bridge(mockFuture()).handle({authorization:"Bearer test-session",body:{goal:"Build app",steps:cyclic}});
    expect(result.status).toBe(422);
  });
});

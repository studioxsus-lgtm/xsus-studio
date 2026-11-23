import {describe,it,expect,vi} from "vitest";
import {createHostFencingBoundary} from "../../src/xsus-app-build-engine/sandbox/host-fencing-boundary.js";
const request={executionId:"execution-0001",ownerId:"owner-0001",holderId:"worker-0001",fence:3,operation:"launch",payload:{image:"pinned"}};
function setup({allowed=true,accepted=true,applied=true,override={}}={}){
 const authorize=vi.fn(async()=>allowed);
 const agent={applyFencedAction:vi.fn(async input=>({...input,accepted,applied,reason:"host-ack",...override}))};
 return {boundary:createHostFencingBoundary({agent,authorize}),agent,authorize};
}
describe("XSUS phase 48 host fencing boundary contract",()=>{
 it("requires trusted agent and authorization",()=>expect(()=>createHostFencingBoundary()).toThrow("dependencies"));
 it("forwards fenced launch to trusted agent",async()=>{const x=setup();const result=await x.boundary.apply(request);expect(result.applied).toBe(true);expect(x.agent.applyFencedAction).toHaveBeenCalledOnce();});
 it("forwards fenced stop",async()=>expect((await setup().boundary.apply({...request,operation:"stop"})).operation).toBe("stop"));
 it("forwards fenced cleanup",async()=>expect((await setup().boundary.apply({...request,operation:"cleanup"})).operation).toBe("cleanup"));
 it("denies unauthorized operation before host action",async()=>{const x=setup({allowed:false});await expect(x.boundary.apply(request)).rejects.toThrow("unauthorized");expect(x.agent.applyFencedAction).not.toHaveBeenCalled();});
 it("rejects stale token when agent refuses",async()=>await expect(setup({accepted:false}).boundary.apply(request)).rejects.toThrow("rejected"));
 it("rejects host acknowledgement without applied action",async()=>await expect(setup({applied:false}).boundary.apply(request)).rejects.toThrow("not applied"));
 it("rejects mismatched host fencing token",async()=>await expect(setup({override:{fence:4}}).boundary.apply(request)).rejects.toThrow("mismatch"));
 it("rejects mismatched host execution ID",async()=>await expect(setup({override:{executionId:"execution-0002"}}).boundary.apply(request)).rejects.toThrow("mismatch"));
 it("rejects malformed fence",async()=>await expect(setup().boundary.apply({...request,fence:0})).rejects.toThrow("request"));
 it("rejects unsupported operations",async()=>await expect(setup().boundary.apply({...request,operation:"shell"})).rejects.toThrow("request"));
 it("rejects pre-aborted requests without host action",async()=>{const x=setup();const controller=new AbortController();controller.abort();await expect(x.boundary.apply({...request,signal:controller.signal})).rejects.toThrow("cancelled");expect(x.agent.applyFencedAction).not.toHaveBeenCalled();});
});

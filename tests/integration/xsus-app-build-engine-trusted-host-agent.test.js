import {describe,it,expect,vi} from "vitest";
import {createTrustedHostAgent} from "../../src/xsus-app-build-engine/sandbox/trusted-host-agent.js";
const args={executionId:"execution-0001",holderId:"worker-0001",fence:3,operation:"launch"};
function setup(initial=null){let stored=initial;const trace=[];const dependencies={
 withExclusiveExecutionLock:vi.fn(async(_id,fn)=>{trace.push("lock");const r=await fn();trace.push("unlock");return r;}),
 readFence:vi.fn(async()=>stored),
 writeFence:vi.fn(async(_id,next,previous)=>{if(stored!==previous)throw new Error("CAS mismatch");stored=next;trace.push("fence");}),
 performAction:vi.fn(async()=>{trace.push("action");return {applied:true};}),
 writeReceipt:vi.fn(async()=>{trace.push("receipt");})
 };return {agent:createTrustedHostAgent(dependencies),dependencies,trace,getFence:()=>stored};}
describe("XSUS phase 49 trusted host agent contracts",()=>{
 it("requires trusted dependencies",()=>expect(()=>createTrustedHostAgent()).toThrow("dependencies"));
 it("performs action within exclusive lock",async()=>{const x=setup();await x.agent.applyFencedAction(args);expect(x.trace).toEqual(["lock","fence","action","receipt","unlock"]);});
 it("returns matching acknowledgement",async()=>expect(await setup().agent.applyFencedAction(args)).toMatchObject({...args,accepted:true,applied:true}));
 it("rejects stale fencing tokens",async()=>{const x=setup(4);await expect(x.agent.applyFencedAction(args)).rejects.toThrow("Stale");expect(x.dependencies.performAction).not.toHaveBeenCalled();});
 it("allows current fence",async()=>{const x=setup(3);await x.agent.applyFencedAction(args);expect(x.dependencies.writeFence).not.toHaveBeenCalled();});
 it("persists newer fence before action",async()=>{const x=setup(2);await x.agent.applyFencedAction(args);expect(x.getFence()).toBe(3);expect(x.trace.indexOf("fence")).toBeLessThan(x.trace.indexOf("action"));});
 it("rejects invalid token",async()=>await expect(setup().agent.applyFencedAction({...args,fence:0})).rejects.toThrow("identity"));
 it("rejects unsupported operation",async()=>await expect(setup().agent.applyFencedAction({...args,operation:"shell"})).rejects.toThrow("identity"));
 it("rejects pre-aborted action",async()=>{const x=setup();const controller=new AbortController();controller.abort();await expect(x.agent.applyFencedAction({...args,signal:controller.signal})).rejects.toThrow("cancelled");expect(x.dependencies.performAction).not.toHaveBeenCalled();});
 it("refuses unconfirmed physical action",async()=>{const x=setup();x.dependencies.performAction.mockResolvedValue({applied:false});await expect(x.agent.applyFencedAction(args)).rejects.toThrow("unconfirmed");expect(x.dependencies.writeReceipt).not.toHaveBeenCalled();});
 it("refuses success when durable receipt fails",async()=>{const x=setup();x.dependencies.writeReceipt.mockRejectedValue(new Error("disk error"));await expect(x.agent.applyFencedAction(args)).rejects.toThrow("disk error");});
 it("supports cleanup with same fenced protocol",async()=>expect((await setup().agent.applyFencedAction({...args,operation:"cleanup"})).operation).toBe("cleanup"));
});

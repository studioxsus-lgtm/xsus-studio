import {describe,it,expect,vi} from "vitest";
import {createHostOperationIntegration} from "../../src/xsus-app-build-engine/sandbox/host-operation-integration.js";
const request={executionId:"execution-0001",operationId:"operation-0001",ownerId:"owner-0001",holderId:"worker-0001",fence:3,operation:"launch"};
function setup({authorized=true,priorFence=null}={}){
 const records=new Map(),trace=[];let hostFence=priorFence;
 const store={
  read:async(e,o)=>records.get(e+":"+o)??null,
  createIfAbsent:async r=>{const k=r.executionId+":"+r.operationId;if(records.has(k))return false;records.set(k,r);return true;},
  compareAndSwap:async(old,next)=>{const k=old.executionId+":"+old.operationId;if(records.get(k)!==old)return false;records.set(k,next);return true;}
 };
 const performAction=vi.fn(async()=>{trace.push("physical");return {applied:true};});
 const writeReceipt=vi.fn(async()=>{trace.push("receipt");});
 const authorize=vi.fn(async()=>authorized);
 const integrated=createHostOperationIntegration({
  store,withExclusiveExecutionLock:async(_id,fn)=>{trace.push("lock");try{return await fn();}finally{trace.push("unlock");}},
  readFence:async()=>hostFence,writeFence:async(_id,next)=>{hostFence=next;trace.push("fence");},
  performAction,writeReceipt,authorize
 });
 return {integrated,performAction,writeReceipt,authorize,trace,records};
}
describe("XSUS phase 51 host operation integration",()=>{
 it("requires authorization provider",()=>expect(()=>createHostOperationIntegration({})).toThrow("authorization"));
 it("executes fenced action and durable ledger",async()=>{const x=setup();expect((await x.integrated.apply(request)).status).toBe("applied");expect((await x.integrated.inspect(request)).status).toBe("applied");});
 it("holds one outer lock through receipt",async()=>{const x=setup();await x.integrated.apply(request);expect(x.trace).toEqual(["lock","fence","physical","receipt","unlock"]);});
 it("does not repeat applied operation",async()=>{const x=setup();await x.integrated.apply(request);expect((await x.integrated.apply(request)).status).toBe("already-applied");expect(x.performAction).toHaveBeenCalledOnce();});
 it("rejects unauthorized requests before host activity",async()=>{const x=setup({authorized:false});await expect(x.integrated.apply(request)).rejects.toThrow("unauthorized");expect(x.performAction).not.toHaveBeenCalled();});
 it("rejects stale fencing token",async()=>{const x=setup({priorFence:4});await expect(x.integrated.apply(request)).rejects.toThrow("Stale");expect(x.performAction).not.toHaveBeenCalled();expect((await x.integrated.inspect(request)).status).toBe("uncertain");});
 it("rejects conflicting operation reuse",async()=>{const x=setup();await x.integrated.apply(request);await expect(x.integrated.apply({...request,fence:4})).rejects.toThrow("conflict");});
 it("marks failed host action uncertain",async()=>{const x=setup();x.performAction.mockRejectedValue(new Error("host down"));await expect(x.integrated.apply(request)).rejects.toThrow("host down");expect((await x.integrated.inspect(request)).status).toBe("uncertain");});
 it("does not mark action applied when receipt fails",async()=>{const x=setup();x.writeReceipt.mockRejectedValue(new Error("receipt failed"));await expect(x.integrated.apply(request)).rejects.toThrow("receipt failed");expect((await x.integrated.inspect(request)).status).toBe("uncertain");});
 it("refuses pre-aborted operation",async()=>{const x=setup(),controller=new AbortController();controller.abort();await expect(x.integrated.apply({...request,signal:controller.signal})).rejects.toThrow("cancelled");expect(x.performAction).not.toHaveBeenCalled();});
 it("rejects invalid operation ID",async()=>await expect(setup().integrated.apply({...request,operationId:"../bad"})).rejects.toThrow("Invalid"));
 it("supports cleanup operation",async()=>expect((await setup().integrated.apply({...request,operation:"cleanup"})).operation).toBe("cleanup"));
});

import {describe,it,expect,vi} from "vitest";
import {createRuntimeExecutionBinding} from "../../src/xsus-app-build-engine/sandbox/runtime-execution-binding.js";
const executionId="execution-0001",ownerId="owner-0001";
const args={executionId,ownerId,manifest:{},policy:{}};
function setup({allow=true,success=true,runError=null,cleanup=false}={}){
 const registered={executionId,ownerId,state:"registered",revision:1,fence:1};
 const running={...registered,state:"running",revision:2,fence:2};
 const lifecycle={
  register:vi.fn(async()=>({execution:registered})),
  start:vi.fn(async()=>({execution:running})),
  complete:vi.fn(async()=>({execution:{...running,state:"completed",revision:3,fence:3},audit:{sequence:3}})),
  fail:vi.fn(async()=>({execution:{...running,state:"failed",revision:3,fence:3},audit:{sequence:3}})),
  inspect:vi.fn(async()=>({execution:running})),
  markCleaned:vi.fn(async()=>({execution:{...running,state:"cleaned"}}))
 };
 const executor={runIsolated:vi.fn(async()=>{if(runError)throw runError;return {success,diagnostics:[],proof:null};})};
 const authorize=vi.fn(async()=>allow),verifyCleanup=vi.fn(async()=>cleanup);
 return {binding:createRuntimeExecutionBinding({lifecycle,executor,authorize,verifyCleanup}),lifecycle,executor,authorize,verifyCleanup};
}
describe("XSUS phase 42 runtime execution binding",()=>{
 it("requires trusted dependencies",()=>expect(()=>createRuntimeExecutionBinding()).toThrow("lifecycle"));
 it("registers, starts and completes successful execution",async()=>{const x=setup();const r=await x.binding.execute(args);expect(r.completed).toBe(true);expect(x.lifecycle.complete).toHaveBeenCalledOnce();});
 it("records unsuccessful runtime as failed",async()=>{const x=setup({success:false});const r=await x.binding.execute(args);expect(r.completed).toBe(false);expect(x.lifecycle.fail).toHaveBeenCalledOnce();});
 it("records thrown runtime errors as failed",async()=>{const x=setup({runError:new Error("container crashed")});await expect(x.binding.execute(args)).rejects.toThrow("Runtime failed");expect(x.lifecycle.fail).toHaveBeenCalledOnce();});
 it("refuses unauthorized execution before registration",async()=>{const x=setup({allow:false});await expect(x.binding.execute(args)).rejects.toThrow("denied");expect(x.lifecycle.register).not.toHaveBeenCalled();});
 it("refuses pre-aborted execution before registration",async()=>{const x=setup();const controller=new AbortController();controller.abort();await expect(x.binding.execute({...args,signal:controller.signal})).rejects.toThrow("cancelled");expect(x.lifecycle.register).not.toHaveBeenCalled();});
 it("refuses invalid IDs",async()=>await expect(setup().binding.execute({...args,executionId:"../bad"})).rejects.toThrow("identity"));
 it("inspects only authorized executions",async()=>{const x=setup();await x.binding.inspect({executionId,ownerId});expect(x.lifecycle.inspect).toHaveBeenCalledOnce();});
 it("requires recovery state for cleanup",async()=>{const x=setup({cleanup:true});await expect(x.binding.confirmCleanup({executionId,ownerId,current:{executionId,ownerId,state:"failed"}})).rejects.toThrow("Recovery");});
 it("rejects unverified cleanup evidence",async()=>{const x=setup();await expect(x.binding.confirmCleanup({executionId,ownerId,current:{executionId,ownerId,state:"recovering",revision:4,fence:4}})).rejects.toThrow("unverified");expect(x.lifecycle.markCleaned).not.toHaveBeenCalled();});
 it("marks cleaned only with verified receipt",async()=>{const x=setup({cleanup:true});const current={executionId,ownerId,state:"recovering",revision:4,fence:4};await x.binding.confirmCleanup({executionId,ownerId,current,receipt:{id:"r"}});expect(x.lifecycle.markCleaned).toHaveBeenCalledOnce();});
});

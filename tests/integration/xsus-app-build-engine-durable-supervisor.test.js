import {describe,it,expect,vi} from "vitest";
import {createDurableRuntimeSupervisor} from "../../src/xsus-app-build-engine/sandbox/durable-runtime-supervisor.js";
const executionId="execution-0001",ownerId="owner-0001";
function setup({state="running",status="running",trusted=true,active=true,expiresAt=200,fence=2,auditMismatch=false}={}){
 const execution={executionId,ownerId,state,revision:2,fence:2};
 const inspect=vi.fn(async()=>({execution,audit:{sequence:auditMismatch?1:2,fence:2,to:state}}));
 const observeHost=vi.fn(async()=>({status,trusted}));
 const readLease=vi.fn(async()=>({active,expiresAt,fence}));
 return {supervisor:createDurableRuntimeSupervisor({inspect,observeHost,readLease,clock:()=>100}),inspect,observeHost,readLease};
}
const args={executionId,ownerId};
describe("XSUS phase 43 durable runtime supervision",()=>{
 it("requires trusted dependencies",()=>expect(()=>createDurableRuntimeSupervisor()).toThrow("dependencies"));
 it("recognizes healthy running execution",async()=>expect((await setup().supervisor.assess(args)).classification).toBe("observed-running"));
 it("classifies expired absent execution for manual reconciliation",async()=>{const r=await setup({status:"absent",active:false,expiresAt:50}).supervisor.assess(args);expect(r).toMatchObject({classification:"requires-reconciliation",action:"manual-review"});});
 it("never auto-retries uncertain execution",async()=>expect((await setup({status:"unknown"}).supervisor.assess(args)).action).toBe("none"));
 it("rejects untrusted host observations",async()=>expect((await setup({trusted:false}).supervisor.assess(args)).classification).toBe("uncertain"));
 it("rejects stale lease fences",async()=>expect((await setup({fence:1}).supervisor.assess(args)).classification).toBe("uncertain"));
 it("recognizes completed executions without host access",async()=>{const x=setup({state:"completed"});expect((await x.supervisor.assess(args)).classification).toBe("terminal");expect(x.observeHost).not.toHaveBeenCalled();});
 it("recognizes failed executions as terminal",async()=>expect((await setup({state:"failed"}).supervisor.assess(args)).classification).toBe("terminal"));
 it("rejects mismatched audit head",async()=>await expect(setup({auditMismatch:true}).supervisor.assess(args)).rejects.toThrow("Audit"));
 it("rejects malformed execution IDs",async()=>await expect(setup().supervisor.assess({...args,executionId:"../bad"})).rejects.toThrow("identity"));
 it("does not infer completion from exited container",async()=>expect((await setup({status:"exited"}).supervisor.assess(args)).classification).toBe("uncertain"));
});

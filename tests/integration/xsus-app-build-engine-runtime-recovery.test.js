import {describe,it,expect,vi} from "vitest";
import {createRuntimeRecovery} from "../../src/xsus-app-build-engine/sandbox/runtime-recovery.js";
const id="execution-0001";
function setup(overrides={}){
 const removeContainer=vi.fn(async()=>{}),removeStaging=vi.fn(async()=>{});
 const service=createRuntimeRecovery({listContainers:async()=>["xsus-"+id,"other-container"],listStaging:async()=>[id],removeContainer,removeStaging,isExecutionActive:async()=>false,...overrides});
 return {service,removeContainer,removeStaging};
}
describe("XSUS phase 33 recovery coordinator",()=>{
 it("requires all recovery dependencies",()=>expect(()=>createRuntimeRecovery({})).toThrow("requires"));
 it("inspects only owned container names",async()=>expect(await setup().service.inspect()).toEqual([{executionId:id,container:"xsus-"+id,staging:true}]));
 it("defaults to dry-run without approvals",async()=>expect((await setup().service.recover()).actions).toEqual([]));
 it("plans cleanup without deleting resources",async()=>{const x=setup();const r=await x.service.recover({approvedIds:[id]});expect(r.actions[0].status).toBe("planned");expect(x.removeContainer).not.toHaveBeenCalled();});
 it("refuses unknown execution approvals",async()=>await expect(setup().service.recover({approvedIds:["execution-9999"]})).rejects.toThrow("unknown"));
 it("refuses duplicate approvals",async()=>await expect(setup().service.recover({approvedIds:[id,id]})).rejects.toThrow("approvals"));
 it("never cleans an active execution",async()=>{const x=setup({isExecutionActive:async()=>true});expect((await x.service.recover({approvedIds:[id],dryRun:false})).actions).toEqual([]);expect(x.removeContainer).not.toHaveBeenCalled();});
 it("cleans container and staging when explicitly approved",async()=>{const x=setup();const r=await x.service.recover({approvedIds:[id],dryRun:false});expect(r.actions[0].status).toBe("cleaned");expect(x.removeContainer).toHaveBeenCalledWith("xsus-"+id);expect(x.removeStaging).toHaveBeenCalledWith(id);});
 it("stops before staging cleanup when container removal fails",async()=>{const x=setup({removeContainer:async()=>{throw new Error("daemon failed");}});await expect(x.service.recover({approvedIds:[id],dryRun:false})).rejects.toThrow("daemon failed");expect(x.removeStaging).not.toHaveBeenCalled();});
 it("rejects malformed inventory",async()=>await expect(setup({listContainers:async()=>null}).service.inspect()).rejects.toThrow("inventory"));
});

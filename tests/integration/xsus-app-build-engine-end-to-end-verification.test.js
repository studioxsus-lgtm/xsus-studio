import {describe,it,expect,vi} from "vitest";
import {createVerifiedProjectBuild} from "../../src/xsus-app-build-engine/integration/verified-project-build.js";
import {verifyStaticBuild} from "../../src/xsus-app-build-engine/integration/build-verification-gate.js";
const request={ownerId:"owner-0001",projectId:"project-0001",executionId:"execution-0001",operationId:"operation-0001",prompt:"Create a notes app",policy:{}};
const architecture={name:"Notes App",slug:"notes-app",modules:[{id:"home",kind:"page"}],routes:[{id:"homeRoute",path:"/",moduleId:"home"}]};
function setup(){
 const events=[];
 const authorize=vi.fn(async()=>{events.push("authorize");return true;});
 const planner=vi.fn(async()=>{events.push("plan");return architecture;});
 const runtime={execute:vi.fn(async({manifest})=>{events.push("execute");expect(verifyStaticBuild(manifest).verified).toBe(true);return {success:true,diagnostics:[]};})};
 const recordResult=vi.fn(async()=>{events.push("record");});
 return {api:createVerifiedProjectBuild({planner,authorize,runtime,recordResult}),events,authorize,planner,runtime,recordResult};
}
describe("XSUS phase 65 end-to-end build verification",()=>{
 it("runs authorization, planning, generation, preflight, runtime and receipt in order",async()=>{const x=setup();expect((await x.api.build(request)).status).toBe("succeeded");expect(x.events).toEqual(["authorize","plan","execute","record"]);});
 it("passes three generated files to runtime",async()=>{const x=setup();await x.api.build(request);expect(x.runtime.execute.mock.calls[0][0].manifest.files.map(f=>f.path)).toEqual(["index.html","styles.css","main.js"]);});
 it("returns only result metadata",async()=>{const x=setup();const result=await x.api.build(request);expect(result).not.toHaveProperty("manifest");expect(result).not.toHaveProperty("files");});
 it("rejects malformed HTML entry",()=>expect(()=>verifyStaticBuild({project:"notes-app",files:[{path:"index.html",content:"broken"},{path:"styles.css",content:""},{path:"main.js",content:""}]})).toThrow("HTML"));
 it("rejects missing JavaScript dependency",()=>expect(()=>verifyStaticBuild({project:"notes-app",files:[{path:"index.html",content:"<!doctype html><html><main></main></html>"},{path:"styles.css",content:""}]})).toThrow("main.js"));
 it("blocks unauthorized requests before planning",async()=>{const x=setup();x.authorize.mockResolvedValue(false);await expect(x.api.build(request)).rejects.toThrow("unauthorized");expect(x.planner).not.toHaveBeenCalled();});
 it("blocks invalid generated architecture before runtime",async()=>{const x=setup();x.planner.mockResolvedValue({...architecture,slug:"../escape"});await expect(x.api.build(request)).rejects.toThrow("slug");expect(x.runtime.execute).not.toHaveBeenCalled();});
 it("records runtime failure without reporting success",async()=>{const x=setup();x.runtime.execute.mockResolvedValue({success:false,diagnostics:[{level:"error",message:"build failed"}]});const result=await x.api.build(request);expect(result.status).toBe("failed");expect(x.recordResult).toHaveBeenCalledWith(expect.objectContaining({status:"failed"}));});
 it("records uncertain outcome on runtime exception",async()=>{const x=setup();x.runtime.execute.mockRejectedValue(new Error("lost host"));await expect(x.api.build(request)).rejects.toThrow("lost host");expect(x.recordResult).toHaveBeenCalledWith(expect.objectContaining({status:"uncertain"}));});
 it("rejects missing runtime",()=>expect(()=>createVerifiedProjectBuild({})).toThrow("runtime"));
 it("prevents execution after cancellation",async()=>{const x=setup(),controller=new AbortController();controller.abort();await expect(x.api.build({...request,signal:controller.signal})).rejects.toThrow("cancelled");expect(x.runtime.execute).not.toHaveBeenCalled();});
 it("reports receipt persistence failure",async()=>{const x=setup();x.recordResult.mockRejectedValue(new Error("receipt unavailable"));await expect(x.api.build(request)).rejects.toThrow("receipt unavailable");});
});

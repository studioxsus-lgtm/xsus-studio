import {describe,it,expect,vi} from "vitest";
import {createXsusAppBuildBridge} from "../../src/xsus-app-build-engine/integration/xsus-app-build-bridge.js";
const args={ownerId:"owner-0001",projectId:"project-0001",executionId:"execution-0001",operationId:"operation-0001",prompt:"Build a notes app",policy:{}};
const project={project:"notes-app",files:[{path:"index.html",content:"<!doctype html><title>Notes</title>"}]};
function setup(){
 const authorize=vi.fn(async()=>true),generateProject=vi.fn(async()=>project),runtime={execute:vi.fn(async()=>({success:true,diagnostics:[]}))},recordResult=vi.fn(async()=>{});
 return {bridge:createXsusAppBuildBridge({authorize,generateProject,runtime,recordResult}),authorize,generateProject,runtime,recordResult};
}
describe("XSUS phase 63 app build bridge",()=>{
 it("requires trusted dependencies",()=>expect(()=>createXsusAppBuildBridge()).toThrow("dependencies"));
 it("authorizes and runs validated manifest",async()=>{const x=setup();expect((await x.bridge.build(args)).status).toBe("succeeded");expect(x.runtime.execute.mock.calls[0][0].manifest.files[0].path).toBe("index.html");});
 it("denies unauthorized requests",async()=>{const x=setup();x.authorize.mockResolvedValue(false);await expect(x.bridge.build(args)).rejects.toThrow("unauthorized");expect(x.generateProject).not.toHaveBeenCalled();});
 it("rejects invalid prompt",async()=>await expect(setup().bridge.build({...args,prompt:" "})).rejects.toThrow("Invalid"));
 it("rejects invalid identifiers",async()=>await expect(setup().bridge.build({...args,ownerId:"../bad"})).rejects.toThrow("Invalid"));
 it("rejects unsafe generated files",async()=>{const x=setup();x.generateProject.mockResolvedValue({project:"notes-app",files:[{path:"../escape",content:"x"}]});await expect(x.bridge.build(args)).rejects.toThrow();expect(x.runtime.execute).not.toHaveBeenCalled();});
 it("rejects missing index.html",async()=>{const x=setup();x.generateProject.mockResolvedValue({project:"notes-app",files:[{path:"readme.md",content:"x"}]});await expect(x.bridge.build(args)).rejects.toThrow("index.html");});
 it("records runtime failure status",async()=>{const x=setup();x.runtime.execute.mockResolvedValue({success:false,diagnostics:[]});expect((await x.bridge.build(args)).status).toBe("failed");expect(x.recordResult).toHaveBeenCalledWith(expect.objectContaining({status:"failed"}));});
 it("records uncertain status on runtime exception",async()=>{const x=setup();x.runtime.execute.mockRejectedValue(new Error("runtime lost"));await expect(x.bridge.build(args)).rejects.toThrow("runtime lost");expect(x.recordResult).toHaveBeenCalledWith(expect.objectContaining({status:"uncertain"}));});
 it("propagates persistence failure",async()=>{const x=setup();x.recordResult.mockRejectedValue(new Error("write failed"));await expect(x.bridge.build(args)).rejects.toThrow("write failed");});
 it("rejects pre-aborted signal",async()=>{const x=setup(),controller=new AbortController();controller.abort();await expect(x.bridge.build({...args,signal:controller.signal})).rejects.toThrow("cancelled");});
 it("does not expose raw generated source in result",async()=>{const x=setup();const result=await x.bridge.build(args);expect(result).not.toHaveProperty("manifest");});
});

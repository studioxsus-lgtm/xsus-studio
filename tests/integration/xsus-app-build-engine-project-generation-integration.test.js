import {describe,it,expect,vi} from "vitest";
import {createProjectGenerationIntegration} from "../../src/xsus-app-build-engine/integration/project-generation-integration.js";
const args={ownerId:"owner-0001",projectId:"project-0001",executionId:"execution-0001",operationId:"operation-0001",prompt:"Build a notes app",policy:{}};
const architecture={name:"Notes App",slug:"notes-app",modules:[{id:"home",kind:"page"}],routes:[{id:"homeRoute",path:"/",moduleId:"home"}]};
function setup(){const planner=vi.fn(async()=>architecture),authorize=vi.fn(async()=>true),runtime={execute:vi.fn(async()=>({success:true,diagnostics:[]}))},recordResult=vi.fn(async()=>{});return {api:createProjectGenerationIntegration({planner,authorize,runtime,recordResult}),planner,authorize,runtime,recordResult};}
describe("XSUS phase 64 project generation integration",()=>{
 it("requires trusted planner",()=>expect(()=>createProjectGenerationIntegration()).toThrow("planner"));
 it("generates buildable static project",async()=>{const x=setup();const result=await x.api.build(args);expect(result.status).toBe("succeeded");const manifest=x.runtime.execute.mock.calls[0][0].manifest;expect(manifest.project).toBe("notes-app");expect(manifest.files.map(f=>f.path)).toEqual(["index.html","styles.css","main.js"]);});
 it("passes request to planner",async()=>{const x=setup();await x.api.build(args);expect(x.planner).toHaveBeenCalledWith(expect.objectContaining({ownerId:args.ownerId,projectId:args.projectId,prompt:args.prompt}));});
 it("denies unauthorized build before planning",async()=>{const x=setup();x.authorize.mockResolvedValue(false);await expect(x.api.build(args)).rejects.toThrow("unauthorized");expect(x.planner).not.toHaveBeenCalled();});
 it("rejects invalid architecture",async()=>{const x=setup();x.planner.mockResolvedValue({name:"Broken",slug:"broken"});await expect(x.api.build(args)).rejects.toThrow("page");expect(x.runtime.execute).not.toHaveBeenCalled();});
 it("rejects unknown route module",async()=>{const x=setup();x.planner.mockResolvedValue({...architecture,routes:[{id:"broken",path:"/",moduleId:"missing"}]});await expect(x.api.build(args)).rejects.toThrow("unknown module");});
 it("rejects unsafe slug",async()=>{const x=setup();x.planner.mockResolvedValue({...architecture,slug:"../escape"});await expect(x.api.build(args)).rejects.toThrow("slug");});
 it("records failed runtime result",async()=>{const x=setup();x.runtime.execute.mockResolvedValue({success:false,diagnostics:[]});expect((await x.api.build(args)).status).toBe("failed");});
 it("records uncertain runtime exception",async()=>{const x=setup();x.runtime.execute.mockRejectedValue(new Error("host lost"));await expect(x.api.build(args)).rejects.toThrow("host lost");expect(x.recordResult).toHaveBeenCalledWith(expect.objectContaining({status:"uncertain"}));});
 it("does not run runtime on planner failure",async()=>{const x=setup();x.planner.mockRejectedValue(new Error("planner unavailable"));await expect(x.api.build(args)).rejects.toThrow("planner unavailable");expect(x.runtime.execute).not.toHaveBeenCalled();});
 it("does not expose generated files in response",async()=>{const x=setup();const result=await x.api.build(args);expect(result).not.toHaveProperty("manifest");expect(result).not.toHaveProperty("files");});
 it("does not execute when cancelled before start",async()=>{const x=setup(),controller=new AbortController();controller.abort();await expect(x.api.build({...args,signal:controller.signal})).rejects.toThrow("cancelled");expect(x.planner).not.toHaveBeenCalled();});
});

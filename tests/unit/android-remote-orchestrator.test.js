import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import {createRemoteAndroidCompiler,createRemoteAndroidOrchestrator} from "../../services/src/build-worker/android-remote-orchestrator.js";
const bytes=Buffer.from("504b0304","hex"),sha=createHash("sha256").update(bytes).digest("hex");
const input={applicationId:"com.xsus.tasks",displayName:"Tasks"},options={minSdk:26,theme:"system",primarySeed:"#2563EB",navigation:"single_screen"};
function compiler(digest=sha){return createRemoteAndroidCompiler({endpoint:"https://worker.example/build",token:"x".repeat(40),fetchImpl:vi.fn(async()=>new Response(bytes,{headers:{"content-type":"application/octet-stream","x-xsus-sha256":digest,"x-xsus-artifact-status":"compiled_pending_verification"}}))});}
describe("Remote Android orchestration",()=>{
 it("disabled by default",()=>expect(createRemoteAndroidOrchestrator({env:{}})).toBeNull());
 it("requires trusted authorization",()=>expect(()=>createRemoteAndroidOrchestrator({env:{XSUS_ANDROID_ORCHESTRATION_ENABLED:"true"}})).toThrow());
 it("validates binary artifact",async()=>expect((await compiler()(input,options)).sha256).toBe(sha));
 it("rejects digest mismatch",async()=>await expect(compiler("a".repeat(64))(input,options)).rejects.toThrow());
 it("rejects unsupported navigation",async()=>await expect(compiler()(input,{...options,navigation:"drawer"})).rejects.toThrow());
});

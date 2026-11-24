import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import {orchestrateAndroidBuild as run} from "../../services/src/build-worker/android-triple-core-orchestrator.js";
function fixture(){
 const binding={schema_version:"1.0",project_id:"p",revision:1,snapshot_digest:"a".repeat(64)};
 const reviewRequest={...binding,operation:"project.review",source:"future-xsus-core",destination:"hyper-xsus-core",execution_authorized:false,specification:{project_id:"p",revision:1,application:{platform:"android"}}};
 const plan={functional:{ui:{android:{...binding,features:["task_management"],application_id:"com.xsus.tasks",display_name:"Tasks",min_sdk:26},navigation:"single_screen",style:"modern",motion:"system",adaptive_layout:false,typography:"material_default",design_system:"material3",toolkit:"jetpack_compose",theme:"system",primary_seed:"#2563EB"}},storage:["atomic_json"],database:[],requested_controls:[],suggested_controls:[],permissions:[],unresolved:[],execution_authorized:false};
 const bytes=Buffer.from("504b0304","hex");
 const artifact={kind:"apk",variant:"debug",bytes,size:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};
 const deps={planProject:vi.fn(async()=>({plan,reviewRequest})),reviewTransport:vi.fn(async()=>({...binding,status:"accepted",findings:[]})),authorize:vi.fn(async()=>true),compiler:vi.fn(async()=>artifact)};
 return {deps,plan,binding,artifact};
}
describe("Triple core orchestration",()=>{
 it("coordinates authorized compilation without claiming verification",async()=>{const {deps}=fixture();const r=await run({},deps);expect(r.status).toBe("compiled_pending_verification");expect(r.artifact.signatureVerified).toBe(false);expect(deps.compiler).toHaveBeenCalledOnce()});
 it("blocks incompatible storage",async()=>{const {deps,plan}=fixture();plan.storage=["room"];expect((await run({},deps)).status).toBe("review_required");expect(deps.compiler).not.toHaveBeenCalled()});
 it("blocks denied authorization",async()=>{const {deps}=fixture();deps.authorize.mockResolvedValue(false);expect((await run({},deps)).status).toBe("authorization_required");expect(deps.compiler).not.toHaveBeenCalled()});
 it("blocks rejected review",async()=>{const {deps,binding}=fixture();deps.reviewTransport.mockResolvedValue({...binding,status:"rejected",findings:[]});expect((await run({},deps)).status).toBe("review_required");expect(deps.authorize).not.toHaveBeenCalled()});
 it("rejects corrupted artifact",async()=>{const {deps,artifact}=fixture();deps.compiler.mockResolvedValue({...artifact,sha256:"bad"});await expect(run({},deps)).rejects.toThrow("Invalid compiler artifact")});
 it("propagates unavailable peer",async()=>{const {deps}=fixture();deps.reviewTransport.mockRejectedValue(Error("offline"));await expect(run({},deps)).rejects.toThrow("offline");expect(deps.compiler).not.toHaveBeenCalled()});
});

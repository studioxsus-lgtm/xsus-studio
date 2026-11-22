import {describe,it,expect} from "vitest";
import {createBuildPipeline} from "../../src/xsus-app-build-engine/integration/build-pipeline.js";
import {verifyPreparedBuild} from "../../src/xsus-app-build-engine/integration/build-verification.js";
const request={prompt:"Build a dashboard",projectId:"demo-app"};
const opts={id:"job-0002"};
const evidence=Object.fromEntries(["unitTests","integrationTests","sandboxIsolation","dependencyAudit","deploymentDryRun","rlsVerification"].map(name=>[name,{passed:true,reference:"ci-verified-123"}]));
describe("XSUS build engine phase 23 verification boundary",()=>{
  it("runs the full static verification boundary",async()=>{const prepared=await createBuildPipeline().prepare(request,opts);const result=verifyPreparedBuild(prepared);expect(result.project).toBe("demo-app");expect(result.status).toBe("review-required");});
  it("never grants production approval",async()=>{const prepared=await createBuildPipeline().prepare(request,opts);expect(verifyPreparedBuild(prepared,{evidence}).productionApproved).toBe(false);});
  it("preserves security findings for generated scripts",async()=>{const prepared=await createBuildPipeline().prepare(request,opts);const result=verifyPreparedBuild(prepared,{evidence});expect(result.blockers).toContain("security-gate");expect(result.security.findings.some(f=>f.rule==="ACTIVE_HTML")).toBe(true);});
  it("blocks missing evidence",async()=>{const prepared=await createBuildPipeline().prepare(request,opts);expect(verifyPreparedBuild(prepared).blockers).toContain("sandboxIsolation");});
  it("rejects fabricated approved build objects",()=>{expect(()=>verifyPreparedBuild({status:"ready",productionApproved:true})).toThrow("Untrusted");});
  it("rejects project identity mismatch",async()=>{const prepared=await createBuildPipeline().prepare(request,opts);expect(()=>verifyPreparedBuild({...prepared,project:"other-app"})).toThrow("mismatch");});
  it("rejects an altered architecture slug",async()=>{const prepared=await createBuildPipeline().prepare(request,opts);expect(()=>verifyPreparedBuild({...prepared,architecture:{...prepared.architecture,slug:"other-app"}})).toThrow("mismatch");});
  it("keeps evidence-only approval insufficient",async()=>{const prepared=await createBuildPipeline().prepare(request,opts);const result=verifyPreparedBuild(prepared,{evidence});expect(result.readiness.productionApproved).toBe(false);expect(result.requiresHumanApproval).toBe(true);});
});

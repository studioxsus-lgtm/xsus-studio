import {describe,it,expect} from "vitest";
import {assessReleaseReadiness} from "../../src/xsus-app-build-engine/release/release-readiness.js";
import {createReleaseCandidate} from "../../src/xsus-app-build-engine/release/release-manifest.js";
const input={project:"demo-app",files:[{path:"index.html",content:"<!doctype html><html><head><title>Demo</title><link rel='stylesheet' href='styles.css'></head><body>Hi</body></html>"},{path:"styles.css",content:"body{margin:0}"}]};
const names=["unitTests","integrationTests","sandboxIsolation","dependencyAudit","deploymentDryRun","rlsVerification"];
const evidence=Object.fromEntries(names.map(name=>[name,{passed:true,reference:"ci-run-123"}]));
describe("XSUS release readiness phase 20",()=>{
  it("blocks a release without verification evidence",()=>{const result=assessReleaseReadiness(input);expect(result.status).toBe("blocked");expect(result.blockers).toContain("unitTests");});
  it("requires six distinct verification categories",()=>{expect(assessReleaseReadiness(input).checks).toHaveLength(6);});
  it("rejects ungrounded boolean-only evidence",()=>{expect(assessReleaseReadiness(input,{evidence:{unitTests:true}}).blockers).toContain("unitTests");});
  it("never auto-approves even with evidence",()=>{const result=assessReleaseReadiness(input,{evidence});expect(result.productionApproved).toBe(false);expect(result.requiresHumanApproval).toBe(true);});
  it("blocks dangerous HTML regardless of test evidence",()=>{const unsafe={...input,files:[{path:"index.html",content:input.files[0].content.replace("Hi","<iframe src='x'></iframe>")},input.files[1]]};expect(assessReleaseReadiness(unsafe,{evidence}).blockers).toContain("static-security");});
  it("rejects invalid release versions",()=>{expect(()=>createReleaseCandidate(input,{version:"latest",artifactDigest:"a".repeat(64)})).toThrow("version");});
  it("requires an artifact digest",()=>{expect(()=>createReleaseCandidate(input,{version:"1.0.0"})).toThrow("digest");});
  it("creates a review-only candidate",()=>{const result=createReleaseCandidate(input,{version:"1.0.0",artifactDigest:"a".repeat(64),evidence});expect(result.version).toBe("1.0.0");expect(result.productionApproved).toBe(false);});
});

import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {createAndroidBuildJobs} from "../../services/src/deployment/android-build-jobs.js";
const env={XSUS_ANDROID_ORCHESTRATION_ENABLED:"true"};
const request={owner:"owner-a",projectId:"project-a",goal:"Krijo aplikacion Android me menaxhim detyrash",applicationId:"com.xsus.tasks",displayName:"Tasks",approved:true};
const bytes=Buffer.from("504b03040102","hex");
const artifact={bytes,size:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};
const binding={projectId:request.projectId,revision:1,snapshotDigest:"a".repeat(64),buildDigest:"b".repeat(64)};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(handler,now=Date.now){return createAndroidBuildJobs({env,now,orchestratorFactory:({authorize})=>input=>handler(authorize,input)});}
const success=async authorize=>{if(!await authorize(binding))throw Error("Denied");return {status:"compiled_pending_verification",artifact};};
describe("Android asynchronous build job security",()=>{
 it("defaults to disabled",()=>expect(createAndroidBuildJobs({env:{}})).toBeNull());
 it("requires explicit approval",()=>{const j=setup(success);expect(()=>j.submit({...request,approved:false})).toThrow();});
 it("rejects invalid application identifiers",()=>{const j=setup(success);expect(()=>j.submit({...request,applicationId:"../bad"})).toThrow();});
 it("isolates status by owner and never exposes bytes",async()=>{const j=setup(success),job=j.submit(request);expect(job.status).toBe("queued");expect(j.get("owner-b",job.id)).toBeNull();await tick();const result=j.get(request.owner,job.id);expect(result.status).toBe("compiled_pending_verification");expect(result.sha256).toBe(artifact.sha256);expect(result.signatureVerified).toBe(false);expect(result.installationVerified).toBe(false);expect(result).not.toHaveProperty("bytes");expect(result).not.toHaveProperty("artifact");});
 it("rejects simultaneous builds",async()=>{let release;const j=setup(async a=>{await new Promise(r=>{release=r;});return success(a);});const job=j.submit(request);await tick();expect(()=>j.submit({...request,owner:"owner-b"})).toThrow("Build capacity unavailable");release();await tick();expect(j.get(request.owner,job.id).status).toBe("compiled_pending_verification");});
 it("denies mismatched project and malformed digest",async()=>{const j=setup(async a=>{expect(await a({...binding,projectId:"other"})).toBe(false);expect(await a({...binding,buildDigest:"bad"})).toBe(false);return {status:"authorization_required"};});const job=j.submit(request);await tick();expect(j.get(request.owner,job.id).status).toBe("authorization_required");});
 it("authorizes only once",async()=>{const j=setup(async a=>{expect(await a(binding)).toBe(true);expect(await a(binding)).toBe(false);return {status:"compiled_pending_verification",artifact};});const job=j.submit(request);await tick();expect(j.get(request.owner,job.id).status).toBe("compiled_pending_verification");});
 it("rejects artifacts without authorization",async()=>{const j=setup(async()=>({status:"compiled_pending_verification",artifact}));const job=j.submit(request);await tick();expect(j.get(request.owner,job.id).status).toBe("failed");});
 it("rejects corrupted artifact",async()=>{const j=setup(async a=>{await a(binding);return {status:"compiled_pending_verification",artifact:{...artifact,sha256:"0".repeat(64)}};});const job=j.submit(request);await tick();expect(j.get(request.owner,job.id).status).toBe("failed");});
 it("expires completed jobs and frees capacity",async()=>{let time=100;const j=setup(success,()=>time);const first=j.submit(request);await tick();j.submit(request);await tick();expect(()=>j.submit(request)).toThrow();time+=900000;expect(j.get(request.owner,first.id)).toBeNull();expect(j.submit(request).status).toBe("queued");await tick();});
 it("preserves review-required status",async()=>{const j=setup(async()=>({status:"review_required"}));const job=j.submit(request);await tick();expect(j.get(request.owner,job.id).status).toBe("review_required");});
});

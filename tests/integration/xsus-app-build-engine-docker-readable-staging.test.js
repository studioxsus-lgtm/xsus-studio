import {describe,it,expect,vi} from "vitest";
import {createDockerReadableStaging} from "../../src/xsus-app-build-engine/sandbox/docker-readable-staging.js";
const executionId="execution-0001",path="/var/lib/xsus-sandbox/staging/"+executionId;
const manifest={project:"notes-app",files:[{path:"index.html",content:"hello"}]};
function setup(){const staging={materialize:vi.fn(async()=>({path,verifiedPermissions:true})),removeMaterialized:vi.fn(async()=>{})};const prepareOwnership=vi.fn(async()=>{}),verifyOwnership=vi.fn(async()=>true);return {api:createDockerReadableStaging({staging,prepareOwnership,verifyOwnership}),staging,prepareOwnership,verifyOwnership};}
describe("XSUS phase 71 Docker readable staging",()=>{
 it("requires trusted host helpers",()=>expect(()=>createDockerReadableStaging()).toThrow("dependencies"));
 it("prepares and verifies UID/GID 65534",async()=>{const x=setup();const result=await x.api.materialize(manifest,{executionId});expect(result).toMatchObject({containerUid:65534,containerGid:65534,verifiedPermissions:true});expect(x.prepareOwnership).toHaveBeenCalledWith(expect.objectContaining({uid:65534,gid:65534}));});
 it("rejects unverified ownership",async()=>{const x=setup();x.verifyOwnership.mockResolvedValue(false);await expect(x.api.materialize(manifest,{executionId})).rejects.toThrow("not verified");expect(x.staging.removeMaterialized).toHaveBeenCalledTimes(1);});
 it("cleans up on handoff error",async()=>{const x=setup();x.prepareOwnership.mockRejectedValue(new Error("chown failed"));await expect(x.api.materialize(manifest,{executionId})).rejects.toThrow("chown failed");expect(x.staging.removeMaterialized).toHaveBeenCalledTimes(1);});
 it("preserves cleanup failure",async()=>{const x=setup();x.prepareOwnership.mockRejectedValue(new Error("chown failed"));x.staging.removeMaterialized.mockRejectedValue(new Error("cleanup failed"));await expect(x.api.materialize(manifest,{executionId})).rejects.toBeInstanceOf(AggregateError);});
 it("rejects malformed identity before staging",async()=>{const x=setup();await expect(x.api.materialize(manifest,{executionId:"bad"})).rejects.toThrow("identity");expect(x.staging.materialize).not.toHaveBeenCalled();});
 it("rejects unsafe manifest before staging",async()=>{const x=setup();await expect(x.api.materialize({project:"notes-app",files:[{path:"../escape",content:"x"}]},{executionId})).rejects.toThrow();expect(x.staging.materialize).not.toHaveBeenCalled();});
 it("rejects pre-aborted request",async()=>{const x=setup();await expect(x.api.materialize(manifest,{executionId,signal:{aborted:true}})).rejects.toThrow("cancelled");});
 it("rejects untrusted staging path",async()=>{const x=setup();x.staging.materialize.mockResolvedValue({path:"/tmp/bad",verifiedPermissions:true});await expect(x.api.materialize(manifest,{executionId})).rejects.toThrow("Untrusted");expect(x.prepareOwnership).not.toHaveBeenCalled();});
 it("supports verified cleanup",async()=>{const x=setup();const staged=await x.api.materialize(manifest,{executionId});await x.api.removeMaterialized(staged,{executionId});expect(x.staging.removeMaterialized).toHaveBeenCalledTimes(1);});
 it("rejects mismatched cleanup identity",async()=>{const x=setup();await expect(x.api.removeMaterialized({path,containerUid:65534,containerGid:65534},{executionId:"execution-0002"})).rejects.toThrow("identity");});
 it("rejects unverified cleanup descriptor",async()=>{const x=setup();await expect(x.api.removeMaterialized({path},{executionId})).rejects.toThrow("identity");});
});

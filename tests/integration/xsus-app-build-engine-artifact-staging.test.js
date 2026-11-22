import {describe,it,expect} from "vitest";
import {createArtifactStaging} from "../../src/xsus-app-build-engine/sandbox/artifact-staging.js";
const manifest={project:"demo-app",files:[{path:"index.html",content:"hello"}]};
describe("XSUS phase 32 artifact staging contract",()=>{
 it("rejects alternative staging roots",()=>expect(()=>createArtifactStaging({root:"/tmp"})).toThrow("fixed"));
 it("requires a valid execution ID",async()=>await expect(createArtifactStaging().materialize(manifest,{executionId:"bad"})).rejects.toThrow("ID"));
 it("rejects path traversal before touching disk",async()=>await expect(createArtifactStaging().materialize({...manifest,files:[{path:"../secret",content:"x"}]},{executionId:"execution-0001"})).rejects.toThrow("Unsafe"));
 it("rejects absolute paths before touching disk",async()=>await expect(createArtifactStaging().materialize({...manifest,files:[{path:"/etc/passwd",content:"x"}]},{executionId:"execution-0001"})).rejects.toThrow("Unsafe"));
 it("rejects duplicate file paths before touching disk",async()=>await expect(createArtifactStaging().materialize({...manifest,files:[manifest.files[0],manifest.files[0]]},{executionId:"execution-0001"})).rejects.toThrow("Duplicate"));
 it("rejects cancelled requests before touching disk",async()=>await expect(createArtifactStaging().materialize(manifest,{executionId:"execution-0001",signal:{aborted:true}})).rejects.toThrow("cancelled"));
 it("rejects mismatched cleanup identities",async()=>await expect(createArtifactStaging().removeMaterialized({path:"/var/lib/xsus-sandbox/staging/execution-0001"},{executionId:"execution-0002"})).rejects.toThrow("identity"));
});

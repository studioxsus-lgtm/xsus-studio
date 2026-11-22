import {describe,it,expect,vi} from "vitest";
import {createBuildPipeline} from "../../src/xsus-app-build-engine/integration/build-pipeline.js";
import {createFutureLanguageAdapter} from "../../src/xsus-app-build-engine/adapters/future-language-adapter.js";
import {createHyperIntelligenceAdapter} from "../../src/xsus-app-build-engine/adapters/hyper-intelligence-adapter.js";
const request={prompt:"Build a home page",projectId:"demo-app"};
const options={id:"job-1"};
const languageAdapter=createFutureLanguageAdapter({engine:{interpret:async()=>({intent:"Demo application",features:["home"],language:"en"})}});
const intelligenceAdapter=createHyperIntelligenceAdapter({engine:{plan:async()=>({tasks:[{id:"design",action:"design",description:"Design home page",dependsOn:[]}]})}});
describe("XSUS App Build Engine phase 21 integration",()=>{
  it("builds a validated static artifact through both adapters",async()=>{const result=await createBuildPipeline({languageAdapter,intelligenceAdapter}).prepare(request,options);expect(result.manifest.files.map(f=>f.path)).toEqual(["index.html","styles.css","main.js"]);expect(result.architecture.slug).toBe("demo-app");});
  it("always requires review and never approves production",async()=>{const result=await createBuildPipeline({languageAdapter,intelligenceAdapter}).prepare(request,options);expect(result.status).toBe("review-required");expect(result.productionApproved).toBe(false);});
  it("exposes security findings instead of hiding generated scripts",async()=>{const result=await createBuildPipeline({languageAdapter,intelligenceAdapter}).prepare(request,options);expect(result.security.findings.some(f=>f.rule==="ACTIVE_HTML")).toBe(true);});
  it("works without optional external adapters",async()=>{const result=await createBuildPipeline().prepare(request,options);expect(result.manifest.project).toBe("demo-app");});
  it("rejects invalid project slugs before generating files",async()=>{await expect(createBuildPipeline().prepare({...request,projectId:"../bad"},options)).rejects.toThrow();});
  it("does not invoke planner for pre-cancelled jobs",async()=>{const planner=vi.fn();await expect(createBuildPipeline({planner}).prepare(request,{...options,signal:{aborted:true}})).rejects.toThrow("cancelled");expect(planner).not.toHaveBeenCalled();});
  it("rejects planner architecture for another project",async()=>{const planner=()=>({architecture:{name:"Other",slug:"other-app",modules:[{id:"home",kind:"page"}],routes:[{id:"home",path:"/",moduleId:"home"}]}});await expect(createBuildPipeline({planner}).prepare(request,options)).rejects.toThrow("mismatch");});
  it("propagates adapter failures without producing artifacts",async()=>{const broken={normalize:async()=>{throw new Error("Language unavailable");}};await expect(createBuildPipeline({languageAdapter:broken}).prepare(request,options)).rejects.toThrow("Language unavailable");});
});

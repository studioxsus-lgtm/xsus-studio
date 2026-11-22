import {describe,it,expect,vi} from "vitest";
import {BUILD_ENGINE_VERSION,createBuildJob,createOrchestrator,validateBuildRequest} from "../../src/xsus-app-build-engine/index.js";
describe("XSUS App Build Engine foundation",()=>{
  it("validates input and freezes normalized requests",()=>{const input=validateBuildRequest({prompt:"  Build an app  "});expect(input.prompt).toBe("Build an app");expect(Object.isFrozen(input)).toBe(true);});
  it("rejects missing prompts and invalid identifiers",()=>{expect(()=>validateBuildRequest({prompt:" "})).toThrow();expect(()=>createBuildJob({prompt:"ok"},{id:"bad"})).toThrow();});
  it("creates an isolated job",()=>{const job=createBuildJob({prompt:"Create dashboard"},{id:"job_12345678"});expect(job.version).toBe(BUILD_ENGINE_VERSION);expect(job.state).toBe("created");});
  it("plans through injected adapters",async()=>{const planner=vi.fn(async()=>({files:["src/main.ts"]}));const engine=createOrchestrator({planner});const result=await engine.plan({prompt:"Create dashboard"},{id:"job_12345678"});expect(result.state).toBe("planned");expect(result.plan.files).toEqual(["src/main.ts"]);expect(planner).toHaveBeenCalledOnce();});
  it("does not plan when cancelled",async()=>{const planner=vi.fn();const engine=createOrchestrator({planner});await expect(engine.plan({prompt:"Create dashboard"},{id:"job_12345678",signal:{aborted:true}})).rejects.toThrow("cancelled");expect(planner).not.toHaveBeenCalled();});
});

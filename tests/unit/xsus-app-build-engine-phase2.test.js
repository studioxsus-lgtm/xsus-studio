import {describe,it,expect,vi} from "vitest";
import {createJobRegistry} from "../../src/xsus-app-build-engine/core/job-registry.js";
import {transitionJob} from "../../src/xsus-app-build-engine/core/state-machine.js";
import {assertLanguageAdapter,assertIntelligenceAdapter,assertPlanner} from "../../src/xsus-app-build-engine/adapters/contracts.js";
describe("XSUS Build Engine phase 2",()=>{
  const request={prompt:"Build a business dashboard"};
  it("enforces state progression",()=>{const job={state:"created"};expect(transitionJob(job,"validated").state).toBe("validated");expect(()=>transitionJob(job,"ready")).toThrow("Invalid job transition");});
  it("blocks transitions from terminal states",()=>{expect(()=>transitionJob({state:"ready"},"failed")).toThrow();expect(()=>transitionJob({state:"failed"},"created")).toThrow();});
  it("isolates jobs and rejects duplicates",()=>{const registry=createJobRegistry();registry.create(request,{id:"job_12345678"});expect(registry.count()).toBe(1);expect(()=>registry.create(request,{id:"job_12345678"})).toThrow("Duplicate");expect(registry.get("unknown")).toBeNull();});
  it("advances registry jobs",()=>{const registry=createJobRegistry();registry.create(request,{id:"job_12345678"});expect(registry.transition("job_12345678","validated").state).toBe("validated");expect(()=>registry.transition("unknown","failed")).toThrow();});
  it("checks adapter interfaces",()=>{expect(assertLanguageAdapter({normalize:vi.fn()})).toBeTruthy();expect(assertIntelligenceAdapter({analyze:vi.fn()})).toBeTruthy();expect(assertPlanner(vi.fn())).toBeTruthy();expect(()=>assertLanguageAdapter({})).toThrow();expect(()=>assertIntelligenceAdapter(null)).toThrow();});
});

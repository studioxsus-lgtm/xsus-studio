import {describe, it, expect, vi} from "vitest";
import {coordinateDraft, validateLanguageResult, validatePlanResult} from "../../src/core-coordination/phase-12-5.js";
const language = {core:"future-xsus-core",text:"Build an app",status:"unchanged",review_required:false};
const plan = {core:"hyper-xsus-core",state:"draft",executable:false,dependencyGraphValid:true,steps:[{id:"a",task:"Design",dependsOn:[]},{id:"b",task:"Review",dependsOn:["a"]}]};
describe("Phase 12.5 isolated coordination contract", () => {
  it("returns only a non-executable draft", async () => {
    const result = await coordinateDraft({goal:"Build an app",future:vi.fn(async()=>language),hyper:vi.fn(async()=>plan)});
    expect(result.status).toBe("completed");
    expect(result.safety).toEqual({executable:false,sideEffects:false});
    expect(Object.isFrozen(result.plan.steps[0].dependsOn)).toBe(true);
  });
  it("never calls Hyper when Future requires review", async () => {
    const hyper = vi.fn();
    await expect(coordinateDraft({goal:"Build an app",future:async()=>({...language,review_required:true}),hyper})).rejects.toMatchObject({code:"language_review_required"});
    expect(hyper).not.toHaveBeenCalled();
  });
  it("rejects cross-core memory leakage", () => {
    expect(()=>validateLanguageResult({...language,memory:{private:true}})).toThrow();
    expect(()=>validatePlanResult({...plan,token:"private"})).toThrow();
  });
  it("rejects executable and cyclic plans", () => {
    expect(()=>validatePlanResult({...plan,executable:true})).toThrow();
    expect(()=>validatePlanResult({...plan,steps:[{id:"a",task:"A",dependsOn:["b"]},{id:"b",task:"B",dependsOn:["a"]}]})).toThrow();
  });
  it("does not invoke Hyper after abort", async () => {
    const controller = new AbortController(), hyper = vi.fn();
    await expect(coordinateDraft({goal:"Build an app",signal:controller.signal,future:async()=>{controller.abort();return language;},hyper})).rejects.toMatchObject({code:"aborted"});
    expect(hyper).not.toHaveBeenCalled();
  });
});

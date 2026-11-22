import {describe,it,expect,vi} from "vitest";
import {createHyperIntelligenceAdapter} from "../../src/xsus-app-build-engine/adapters/hyper-intelligence-adapter.js";
const input={prompt:"Build an app"};
const valid={tasks:[{id:"design",action:"design",description:"Design UI",dependsOn:[]},{id:"generate",action:"generate",description:"Generate files",dependsOn:["design"]}]};
describe("Hyper XSUS intelligence adapter",()=>{
  it("returns a validated immutable plan",async()=>{const engine={plan:vi.fn(async()=>valid)};const plan=await createHyperIntelligenceAdapter({engine}).analyze(input);expect(plan.version).toBe("1.0.0");expect(plan.tasks).toHaveLength(2);expect(Object.isFrozen(plan.tasks)).toBe(true);});
  it("rejects duplicate IDs",async()=>{const engine={plan:async()=>({tasks:[valid.tasks[0],valid.tasks[0]]})};await expect(createHyperIntelligenceAdapter({engine}).analyze(input)).rejects.toThrow("unique");});
  it("rejects unknown dependencies",async()=>{const engine={plan:async()=>({tasks:[{...valid.tasks[0],dependsOn:["missing"]}]})};await expect(createHyperIntelligenceAdapter({engine}).analyze(input)).rejects.toThrow("dependency");});
  it("rejects cycles",async()=>{const engine={plan:async()=>({tasks:[{...valid.tasks[0],dependsOn:["generate"]},valid.tasks[1]]})};await expect(createHyperIntelligenceAdapter({engine}).analyze(input)).rejects.toThrow("Cyclic");});
  it("rejects unapproved actions",async()=>{const engine={plan:async()=>({tasks:[{...valid.tasks[0],action:"deploy"}]})};await expect(createHyperIntelligenceAdapter({engine}).analyze(input)).rejects.toThrow("Unsupported");});
  it("does not invoke a cancelled request",async()=>{const plan=vi.fn();await expect(createHyperIntelligenceAdapter({engine:{plan}}).analyze(input,{signal:{aborted:true}})).rejects.toThrow("cancelled");expect(plan).not.toHaveBeenCalled();});
});

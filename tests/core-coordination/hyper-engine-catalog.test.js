import {describe,it,expect,vi} from "vitest";
import {createHyperEngineCatalog,HYPER_ENGINE_IDS} from "../../src/core-coordination/hyper-engine-catalog.js";
describe("Phase 12.5.4 Hyper engine catalog",()=>{
  it("discovers all seven declared Hyper engine domains",()=>{
    expect(HYPER_ENGINE_IDS).toHaveLength(7);
    expect(createHyperEngineCatalog().list().map(x=>x.id)).toEqual(HYPER_ENGINE_IDS);
  });
  it("keeps unregistered engines unavailable",async()=>{
    const catalog=createHyperEngineCatalog();
    await expect(catalog.invoke({engineId:"learning",payload:{}})).rejects.toMatchObject({code:"engine_not_approved"});
  });
  it("blocks autonomous execution even if explicitly requested",async()=>{
    const fn=vi.fn();
    const catalog=createHyperEngineCatalog({engines:{"autonomous-execution":fn}});
    await expect(catalog.invoke({engineId:"autonomous-execution",payload:{}})).rejects.toMatchObject({code:"engine_not_approved"});
    expect(fn).not.toHaveBeenCalled();
  });
  it("rejects unsafe approval configuration",()=>{
    expect(()=>createHyperEngineCatalog({approved:["autonomous-execution"]})).toThrow();
  });
  it("permits explicitly approved non-executing results",async()=>{
    const fn=vi.fn(async()=>({executable:false,sideEffects:false}));
    const catalog=createHyperEngineCatalog({engines:{"truth-verification":fn},approved:["truth-verification"]});
    const result=await catalog.invoke({engineId:"truth-verification",payload:{claim:"sample"}});
    expect(result).toMatchObject({status:"completed",executable:false,sideEffects:false});
    expect(fn).toHaveBeenCalledOnce();
  });
  it("rejects unsafe result flags",async()=>{
    const catalog=createHyperEngineCatalog({engines:{"strategic-planning":async()=>({executable:true,sideEffects:false})},approved:["strategic-planning"]});
    await expect(catalog.invoke({engineId:"strategic-planning",payload:{}})).rejects.toMatchObject({code:"unsafe_engine_result"});
  });
});

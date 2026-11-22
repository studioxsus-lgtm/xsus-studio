import {describe,it,expect,vi} from "vitest";
import {createFutureLanguageAdapter} from "../../src/xsus-app-build-engine/adapters/future-language-adapter.js";
describe("Future XSUS language adapter contract",()=>{
  const input={prompt:"Build a dashboard"};
  it("normalizes a structured language specification",async()=>{
    const engine={interpret:vi.fn(async()=>({intent:"create_app",features:["dashboard","reports"],language:"en"}))};
    const result=await createFutureLanguageAdapter({engine}).normalize(input);
    expect(result.specification).toEqual({version:"1.0.0",intent:"create_app",features:["dashboard","reports"],language:"en"});
    expect(engine.interpret).toHaveBeenCalledOnce();
  });
  it("rejects malformed engine responses",async()=>{
    const adapter=createFutureLanguageAdapter({engine:{interpret:async()=>({features:[]})}});
    await expect(adapter.normalize(input)).rejects.toThrow("intent");
  });
  it("rejects unsupported languages",async()=>{
    const adapter=createFutureLanguageAdapter({engine:{interpret:async()=>({intent:"create_app",features:[],language:"xx"})}});
    await expect(adapter.normalize(input)).rejects.toThrow("Unsupported");
  });
  it("validates dependencies and inputs",async()=>{
    expect(()=>createFutureLanguageAdapter({})).toThrow();
    expect(()=>createFutureLanguageAdapter({engine:{interpret:async()=>({})},timeoutMs:0})).toThrow();
    await expect(createFutureLanguageAdapter({engine:{interpret:async()=>({})}}).normalize({prompt:""})).rejects.toThrow();
  });
  it("does not invoke engine when caller cancelled",async()=>{
    const interpret=vi.fn();
    const adapter=createFutureLanguageAdapter({engine:{interpret}});
    await expect(adapter.normalize(input,{signal:{aborted:true}})).rejects.toThrow("cancelled");
    expect(interpret).not.toHaveBeenCalled();
  });
});

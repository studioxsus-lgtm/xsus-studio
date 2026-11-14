import { describe, expect, it, vi } from "vitest";
import { createHyperAppIntegrationBridge as create } from "./hyper-v8230-app-integration-bridge.js";
const storage = () => ({
  store: vi.fn(async () => ({ stored:true, observationId:"obs_1" })),
  readVerified: vi.fn(async () => ({ verified:true, observationId:"obs_1" }))
});
describe("Hyper v8.2.30 App bridge", () => {
  it("starts disabled and never accesses storage", async () => {
    const s=storage(), authorize=vi.fn(async()=>true);
    expect(await create({storage:s,authorize}).execute({action:"evidence.verify",observationId:"obs_1"}))
      .toEqual({ok:false,code:"BRIDGE_DISABLED"});
    expect(authorize).not.toHaveBeenCalled();
  });
  it("rejects unknown actions before authorization", async () => {
    const s=storage(), authorize=vi.fn();
    const b=create({storage:s,authorize,enabled:true});
    expect((await b.execute({action:"delete"})).code).toBe("INVALID_ACTION");
    expect(authorize).not.toHaveBeenCalled();
  });
  it("denies unauthorized requests without storage calls", async () => {
    const s=storage(), b=create({storage:s,authorize:async()=>false,enabled:true});
    expect((await b.execute({action:"evidence.store",input:{}})).code).toBe("ACCESS_DENIED");
    expect(s.store).not.toHaveBeenCalled();
  });
  it("fails closed on authorization errors", async () => {
    const s=storage(), b=create({storage:s,authorize:async()=>{throw Error("private");},enabled:true});
    expect((await b.execute({action:"evidence.verify",observationId:"obs_1"})).code)
      .toBe("ACCESS_DENIED");
  });
  it("stores through authorized server handler", async () => {
    const s=storage(), b=create({storage:s,authorize:async()=>true,enabled:true});
    expect(await b.execute({action:"evidence.store",input:{observationId:"obs_1"}}))
      .toEqual({ok:true,action:"evidence.store",observationId:"obs_1"});
    expect(s.store).toHaveBeenCalledTimes(1);
  });
  it("verifies without returning sensitive evidence", async () => {
    const s=storage(), b=create({storage:s,authorize:async()=>true,enabled:true});
    const r=await b.execute({action:"evidence.verify",observationId:"obs_1"});
    expect(r.verified).toBe(true);
    expect(r.runtimeAttested).toBe(false);
    expect(r).not.toHaveProperty("key");
  });
  it("rejects malformed IDs without invoking storage", async () => {
    const s=storage(), b=create({storage:s,authorize:async()=>true,enabled:true});
    expect((await b.execute({action:"evidence.verify",observationId:"bad/id"})).code)
      .toBe("INVALID_OBSERVATION_ID");
    expect(s.readVerified).not.toHaveBeenCalled();
  });
  it("fails closed on storage exceptions", async () => {
    const s=storage();s.readVerified.mockRejectedValue(Error("private"));
    const b=create({storage:s,authorize:async()=>true,enabled:true});
    expect((await b.execute({action:"evidence.verify",observationId:"obs_1"})).code)
      .toBe("BRIDGE_OPERATION_FAILED");
  });
  it("never grants production eligibility", () => {
    expect(create({storage:storage(),authorize:async()=>true}).productionEligible).toBe(false);
  });
});

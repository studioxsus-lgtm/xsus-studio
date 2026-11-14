import { describe, expect, it, vi } from "vitest";
import { createHyperAppBackendHandler as create } from "./hyper-v8231-backend-handler.js";
const principal = { verified: true, userId: "user_123" };
const body = { action: "evidence.verify", observationId: "obs_1" };
const bridge = () => ({ execute: vi.fn(async () => ({ ok:true, verified:true })) });
const setup = (options = {}) => {
  const b = bridge(), authorizeUser = vi.fn(async () => true);
  return { b, authorizeUser, handler: create({
    bridge:b, authorizeUser, enabled:true, ...options
  }) };
};
describe("Hyper v8.2.31 backend verification handler", () => {
  it("starts disabled", async () => {
    const b=bridge(), authorizeUser=vi.fn();
    const h=create({bridge:b,authorizeUser});
    expect((await h.handle({principal,body})).status).toBe(503);
    expect(b.execute).not.toHaveBeenCalled();
  });
  it("requires server-verified principal", async () => {
    const {handler,b}=setup();
    expect((await handler.handle({principal:{userId:"user_123"},body})).status).toBe(401);
    expect(b.execute).not.toHaveBeenCalled();
  });
  it("refuses client-facing evidence.store", async () => {
    const {handler,b}=setup();
    expect((await handler.handle({principal,body:{action:"evidence.store",input:{}}})).status).toBe(400);
    expect(b.execute).not.toHaveBeenCalled();
  });
  it("rejects malformed observation IDs", async () => {
    const {handler,b}=setup();
    expect((await handler.handle({principal,body:{...body,observationId:"../bad"}})).status).toBe(400);
    expect(b.execute).not.toHaveBeenCalled();
  });
  it("checks user authorization for the observation", async () => {
    const {handler,authorizeUser}=setup();
    expect((await handler.handle({principal,body})).status).toBe(200);
    expect(authorizeUser).toHaveBeenCalledWith({
      userId:"user_123",action:"evidence.verify",observationId:"obs_1"
    });
  });
  it("denies access without querying bridge", async () => {
    const {handler,b}=setup({authorizeUser:async()=>false});
    expect((await handler.handle({principal,body})).status).toBe(403);
    expect(b.execute).not.toHaveBeenCalled();
  });
  it("fails closed when authorization throws", async () => {
    const {handler,b}=setup({authorizeUser:async()=>{throw Error("secret");}});
    expect((await handler.handle({principal,body})).status).toBe(403);
    expect(b.execute).not.toHaveBeenCalled();
  });
  it("returns only a sanitized verification result", async () => {
    const {handler}=setup();
    const result=await handler.handle({principal,body});
    expect(result.body).toEqual({
      ok:true,observationId:"obs_1",verified:true,
      runtimeAttested:false,productionEligible:false
    });
  });
  it("fails closed when bridge errors", async () => {
    const {handler}=setup({bridge:{execute:async()=>{throw Error("private");}}});
    const result=await handler.handle({principal,body});
    expect(result.status).toBe(503);
    expect(JSON.stringify(result)).not.toContain("private");
  });
  it("does not trust request-body identity", async () => {
    const {handler,authorizeUser}=setup();
    await handler.handle({principal,body:{...body,userId:"attacker"}});
    expect(authorizeUser.mock.calls[0][0].userId).toBe("user_123");
  });
});

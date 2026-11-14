import { describe, expect, it, vi } from "vitest";
import { createHyperAuthenticatedApiAdapter as create } from "./hyper-v8232-authenticated-api-adapter.js";
const token = "a".repeat(32);
const request = (overrides = {}) => ({
  method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},
  rawBody:JSON.stringify({action:"evidence.verify",observationId:"obs_1"}),
  ...overrides
});
const setup = (overrides = {}) => {
  const backendHandler = {handle:vi.fn(async()=>({status:200,body:{ok:true,verified:true}}))};
  const verifyBearerToken = vi.fn(async()=>({verified:true,userId:"user_123"}));
  const adapter = create({backendHandler,verifyBearerToken,enabled:true,...overrides});
  return {adapter,backendHandler,verifyBearerToken};
};
describe("Hyper v8.2.32 authenticated API adapter",()=>{
  it("starts disabled",async()=>{
    const {backendHandler,verifyBearerToken}=setup();
    const adapter=create({backendHandler,verifyBearerToken});
    expect((await adapter.handle(request())).status).toBe(503);
    expect(verifyBearerToken).not.toHaveBeenCalled();
  });
  it("allows POST only",async()=>{
    const {adapter}=setup();
    expect((await adapter.handle(request({method:"GET"}))).status).toBe(405);
  });
  it("requires JSON content type",async()=>{
    const {adapter}=setup();
    expect((await adapter.handle(request({headers:{authorization:"Bearer "+token,"content-type":"text/plain"}}))).status).toBe(415);
  });
  it("requires bearer token",async()=>{
    const {adapter,verifyBearerToken}=setup();
    expect((await adapter.handle(request({headers:{"content-type":"application/json"}}))).status).toBe(401);
    expect(verifyBearerToken).not.toHaveBeenCalled();
  });
  it("rejects oversized bodies before token verification",async()=>{
    const {adapter,verifyBearerToken}=setup();
    expect((await adapter.handle(request({rawBody:"x".repeat(2049)}))).status).toBe(413);
    expect(verifyBearerToken).not.toHaveBeenCalled();
  });
  it("rejects invalid JSON",async()=>{
    const {adapter}=setup();
    expect((await adapter.handle(request({rawBody:"{"}))).status).toBe(400);
  });
  it("fails closed when auth provider throws",async()=>{
    const {adapter,backendHandler}=setup({verifyBearerToken:async()=>{throw Error("secret");}});
    expect((await adapter.handle(request())).status).toBe(401);
    expect(backendHandler.handle).not.toHaveBeenCalled();
  });
  it("passes only verified principal to backend",async()=>{
    const {adapter,backendHandler}=setup();
    expect((await adapter.handle(request())).status).toBe(200);
    expect(backendHandler.handle.mock.calls[0][0].principal)
      .toEqual({verified:true,userId:"user_123"});
  });
  it("sets no-store response headers",async()=>{
    const {adapter}=setup();
    const r=await adapter.handle(request());
    expect(r.headers["cache-control"]).toBe("no-store");
  });
  it("sanitizes backend exceptions",async()=>{
    const {adapter}=setup({backendHandler:{handle:async()=>{throw Error("private");}}});
    const r=await adapter.handle(request());
    expect(r.status).toBe(503);
    expect(JSON.stringify(r)).not.toContain("private");
  });
});

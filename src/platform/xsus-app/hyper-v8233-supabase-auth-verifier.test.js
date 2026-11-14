import { describe, expect, it, vi } from "vitest";
import { createHyperSupabaseAuthVerifier as create } from "./hyper-v8233-supabase-auth-verifier.js";
const userId="550e8400-e29b-41d4-a716-446655440000";
const config=fetchImpl=>({url:"https://example.supabase.co",apiKey:"test-publishable-key",fetchImpl});
const token="a".repeat(32);
describe("Hyper v8.2.33 Supabase Auth verifier",()=>{
  it("rejects untrusted domains",()=>{
    expect(()=>create({...config(vi.fn()),url:"https://evil.example"})).toThrow();
  });
  it("starts disabled and makes no request",async()=>{
    const fetchImpl=vi.fn();
    expect((await create(config(fetchImpl)).verifyBearerToken(token)).verified).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects malformed bearer tokens before network",async()=>{
    const fetchImpl=vi.fn();
    const verifier=create({...config(fetchImpl),enabled:true});
    expect((await verifier.verifyBearerToken("bad token")).verified).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("accepts only user IDs returned by Supabase Auth",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({id:userId})}));
    const verifier=create({...config(fetchImpl),enabled:true});
    expect(await verifier.verifyBearerToken(token)).toEqual({verified:true,userId});
    expect(fetchImpl.mock.calls[0][0]).toContain("/auth/v1/user");
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer "+token);
  });
  it("rejects unauthorized provider response",async()=>{
    const verifier=create({...config(async()=>({ok:false,status:401})),enabled:true});
    expect((await verifier.verifyBearerToken(token)).verified).toBe(false);
  });
  it("rejects malformed user payload",async()=>{
    const verifier=create({...config(async()=>({ok:true,json:async()=>({id:"attacker"})})),enabled:true});
    expect((await verifier.verifyBearerToken(token)).verified).toBe(false);
  });
  it("fails closed on provider errors",async()=>{
    const verifier=create({...config(async()=>{throw Error("private");}),enabled:true});
    expect(await verifier.verifyBearerToken(token)).toEqual({verified:false});
  });
});

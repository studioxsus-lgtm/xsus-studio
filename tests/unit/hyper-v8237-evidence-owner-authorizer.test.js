import {describe,it,expect,vi} from "vitest";
import {createHyperEvidenceOwnerAuthorizer} from "../../src/platform/xsus-app/hyper-v8237-evidence-owner-authorizer.js";
const url="https://example-project.supabase.co";
const userId="11111111-1111-4111-8111-111111111111";
const observationId="evidence_123";
const make=(fetchImpl,enabled=true)=>createHyperEvidenceOwnerAuthorizer({
  url,serviceRoleKey:"server-only-test-key",fetchImpl,enabled
});
describe("Hyper v8.2.37 evidence owner authorizer (mocked read-only)",()=>{
  it("defaults to disabled and makes no network calls",async()=>{
    const fetchImpl=vi.fn();const a=make(fetchImpl,false);
    expect(await a.authorizeEvidenceOwner({userId,observationId})).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects invalid identifiers before network access",async()=>{
    const fetchImpl=vi.fn();const a=make(fetchImpl);
    expect(await a.authorizeEvidenceOwner({userId:"bad",observationId})).toBe(false);
    expect(await a.authorizeEvidenceOwner({userId,observationId:"bad id"})).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("authorizes only exactly one matching row",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>[{user_id:userId,observation_id:observationId}]}));
    const a=make(fetchImpl);
    expect(await a.authorizeEvidenceOwner({userId,observationId})).toBe(true);
    const [target,options]=fetchImpl.mock.calls[0];
    expect(target).toContain("/rest/v1/hyper_evidence_owners?");
    expect(target).toContain("user_id=eq.");
    expect(options.method).toBe("GET");
    expect(options.redirect).toBe("error");
    expect(options.body).toBeUndefined();
  });
  it("denies no matching rows",async()=>{
    const a=make(async()=>({ok:true,json:async()=>[]}));
    expect(await a.authorizeEvidenceOwner({userId,observationId})).toBe(false);
  });
  it("denies foreign ownership",async()=>{
    const a=make(async()=>({ok:true,json:async()=>[{user_id:"22222222-2222-4222-8222-222222222222",observation_id:observationId}]}));
    expect(await a.authorizeEvidenceOwner({userId,observationId})).toBe(false);
  });
  it("denies duplicate or ambiguous records",async()=>{
    const row={user_id:userId,observation_id:observationId};
    const a=make(async()=>({ok:true,json:async()=>[row,row]}));
    expect(await a.authorizeEvidenceOwner({userId,observationId})).toBe(false);
  });
  it("fails closed on provider error or malformed JSON",async()=>{
    for(const fetchImpl of [async()=>({ok:false}),async()=>({ok:true,json:async()=>({})}),async()=>{throw Error("network");}]){
      expect(await make(fetchImpl).authorizeEvidenceOwner({userId,observationId})).toBe(false);
    }
  });
  it("rejects insecure configuration",()=>{
    expect(()=>createHyperEvidenceOwnerAuthorizer({url:"http://example-project.supabase.co",serviceRoleKey:"key"})).toThrow();
  });
});

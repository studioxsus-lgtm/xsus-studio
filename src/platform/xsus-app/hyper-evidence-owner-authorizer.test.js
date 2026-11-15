import {describe,it,expect,vi} from "vitest";
import {createHyperEvidenceOwnerAuthorizer} from "./hyper-evidence-owner-authorizer.js";

const userId="550e8400-e29b-41d4-a716-446655440000";
const otherId="550e8400-e29b-41d4-a716-446655440001";
const observationId="obs_1";
const base={url:"https://example.supabase.co",serviceRoleKey:"server-only-test-key"};
const row={user_id:userId,observation_id:observationId};

describe("Hyper evidence ownership authorization: fail-closed",()=>{
  it("denies invalid principal and observation IDs without network access",async()=>{
    const fetchImpl=vi.fn();
    const authorize=createHyperEvidenceOwnerAuthorizer({...base,fetchImpl});
    expect(await authorize({userId:"forged",observationId})).toBe(false);
    expect(await authorize({userId,observationId:"bad/id"})).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("requires one exact ownership record",async()=>{
    for(const rows of [[],[row,row],[{...row,user_id:otherId}],[{...row,observation_id:"other"}]]){
      const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>rows}));
      const authorize=createHyperEvidenceOwnerAuthorizer({...base,fetchImpl});
      expect(await authorize({userId,observationId})).toBe(false);
    }
  });
  it("accepts one matching owner and uses server credentials only",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>[row]}));
    const authorize=createHyperEvidenceOwnerAuthorizer({...base,fetchImpl});
    expect(await authorize({userId,observationId})).toBe(true);
    const [url,options]=fetchImpl.mock.calls[0];
    expect(url).toContain("/rest/v1/hyper_evidence_owners?");
    expect(url).toContain("observation_id=eq.obs_1");
    expect(options.method).toBe("GET");
    expect(options.headers.apikey).toBe(base.serviceRoleKey);
    expect(options.headers.Authorization).toBe("Bearer "+base.serviceRoleKey);
    expect(options.redirect).toBe("error");
    expect(url).not.toContain(userId);
  });
  it("denies forbidden, unavailable and malformed responses",async()=>{
    for(const response of [
      {ok:false,status:403},
      {ok:false,status:500},
      {ok:true,json:async()=>({user_id:userId})},
      {ok:true,json:async()=>{throw Error("invalid JSON");}}
    ]){
      const authorize=createHyperEvidenceOwnerAuthorizer({...base,fetchImpl:async()=>response});
      expect(await authorize({userId,observationId})).toBe(false);
    }
  });
  it("denies network exceptions and rejects untrusted Supabase hosts",async()=>{
    const authorize=createHyperEvidenceOwnerAuthorizer({...base,fetchImpl:async()=>{throw Error("offline");}});
    expect(await authorize({userId,observationId})).toBe(false);
    expect(()=>createHyperEvidenceOwnerAuthorizer({...base,url:"https://example.supabase.co.evil.test"})).toThrow();
    expect(()=>createHyperEvidenceOwnerAuthorizer({...base,url:"http://example.supabase.co"})).toThrow();
  });
});

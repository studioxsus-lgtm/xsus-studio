import {describe,it,expect,vi} from "vitest";
import {createHyperOwnedEvidenceWriter} from "./hyper-owned-evidence-writer.js";
const config={url:"https://example.supabase.co",serviceRoleKey:"test-secret"};
const writer=(fetchImpl,enabled=true)=>createHyperOwnedEvidenceWriter({...config,fetchImpl,enabled});
describe("trusted owned evidence writer",()=>{
 it("is disabled by default",async()=>{
   const fetchImpl=vi.fn();
   const w=writer(fetchImpl,false);
   expect(await w.storeOwned({})).toEqual({stored:false,reason:"WRITER_DISABLED"});
   expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("rejects missing verified principal without network access",async()=>{
   const fetchImpl=vi.fn();
   const result=await writer(fetchImpl).storeOwned({verifiedPrincipal:{userId:"fake"}});
   expect(result.reason).toBe("UNVERIFIED_PRINCIPAL");
   expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("rejects browser-asserted identity without network access",async()=>{
   const fetchImpl=vi.fn();
   const result=await writer(fetchImpl).storeOwned({verifiedPrincipal:{
     verified:true,source:"browser",userId:"550e8400-e29b-41d4-a716-446655440000"
   }});
   expect(result.reason).toBe("UNVERIFIED_PRINCIPAL");
   expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("fails closed on malformed bundle",async()=>{
   const fetchImpl=vi.fn();
   const result=await writer(fetchImpl).storeOwned({verifiedPrincipal:{
     verified:true,source:"server-verified-principal",
     userId:"550e8400-e29b-41d4-a716-446655440000"
   },bundle:{}});
   expect(result.reason).toBe("INVALID_BUNDLE");
   expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("rejects invalid service URL",()=>{
   expect(()=>createHyperOwnedEvidenceWriter({...config,url:"http://example.supabase.co"})).toThrow();
 });
});

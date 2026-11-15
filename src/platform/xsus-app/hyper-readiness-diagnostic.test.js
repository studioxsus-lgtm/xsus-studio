import { describe, it, expect, vi } from "vitest";
import { createHyperReadinessDiagnostic } from "./hyper-readiness-diagnostic.js";

const env = {
 SUPABASE_URL: "https://example.supabase.co",
 XSUS_HYPER_READINESS_ADMIN_IDS: "550e8400-e29b-41d4-a716-446655440000",
 SUPABASE_ANON_KEY: "public-test-key",
 SUPABASE_SERVICE_ROLE_KEY: "server-only-test-key",
 XSUS_HYPER_EVIDENCE_ROUTE_ENABLED: "false"
};
const token = "a".repeat(32);
const request = {method:"GET",authorization:"Bearer "+token};
describe("Hyper read-only diagnostic security",()=>{
 it("is disabled by default and makes no network requests",async()=>{
   const fetchImpl=vi.fn();
   const d=createHyperReadinessDiagnostic({env,fetchImpl});
   expect((await d.handle(request)).status).toBe(503);
   expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("rejects missing authentication without contacting Supabase",async()=>{
   const fetchImpl=vi.fn();
   const d=createHyperReadinessDiagnostic({env,fetchImpl,enabled:true});
   expect((await d.handle({method:"GET"})).status).toBe(401);
   expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("rejects non-GET without contacting Supabase",async()=>{
   const fetchImpl=vi.fn();
   const d=createHyperReadinessDiagnostic({env,fetchImpl,enabled:true});
   expect((await d.handle({...request,method:"POST"})).status).toBe(405);
   expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("refuses invalid Supabase authentication without table reads",async()=>{
   const fetchImpl=vi.fn(async()=>({ok:false}));
   const d=createHyperReadinessDiagnostic({env,fetchImpl,enabled:true});
   expect((await d.handle(request)).status).toBe(401);
   expect(fetchImpl).toHaveBeenCalledTimes(1);
 });
 it("checks only two tables with GET after verified auth and returns no secrets",async()=>{
   const fetchImpl=vi.fn(async url=>String(url).includes("/auth/v1/user")
     ? {ok:true,json:async()=>({id:"550e8400-e29b-41d4-a716-446655440000"})}
     : {ok:true});
   const d=createHyperReadinessDiagnostic({env,fetchImpl,enabled:true});
   const result=await d.handle(request);
   expect(result.status).toBe(200);
   expect(result.body.integrationVerified).toBe(false);
   expect(fetchImpl).toHaveBeenCalledTimes(3);
   expect(fetchImpl.mock.calls.slice(1).every(([,opts])=>opts.method==="GET")).toBe(true);
   expect(JSON.stringify(result.body)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY);
 });
 it("fails closed when either table is unavailable",async()=>{
   const fetchImpl=vi.fn(async url=>String(url).includes("/auth/v1/user")
     ? {ok:true,json:async()=>({id:"550e8400-e29b-41d4-a716-446655440000"})}
     : {ok:!String(url).includes("hyper_evidence_owners")});
   const d=createHyperReadinessDiagnostic({env,fetchImpl,enabled:true});
   expect((await d.handle(request)).status).toBe(503);
 });
 it("denies everyone when administrator allowlist is missing",async()=>{
   const fetchImpl=vi.fn();
   const d=createHyperReadinessDiagnostic({
     env:{...env,XSUS_HYPER_READINESS_ADMIN_IDS:""},fetchImpl,enabled:true
   });
   expect((await d.handle(request)).status).toBe(403);
   expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("denies a valid but non-admin user before any table reads",async()=>{
   const fetchImpl=vi.fn(async()=>({
     ok:true,json:async()=>({id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"})
   }));
   const d=createHyperReadinessDiagnostic({env,fetchImpl,enabled:true});
   expect((await d.handle(request)).status).toBe(403);
   expect(fetchImpl).toHaveBeenCalledTimes(1);
 });

});

import {describe,it,expect} from "vitest";
import {inspectHyperDeploymentConfig as inspect} from "../hyper-deployment-gate.js";
const valid=()=>({
 XSUS_HYPER_APP_ENABLED:"true",
 SUPABASE_URL:"https://example.supabase.co",SUPABASE_ANON_KEY:"public-key",
 XSUS_HYPER_AUDIT_DIRECTORY:"/srv/xsus/audit",
 XSUS_HYPER_AUDIT_KEY:"audit-signing-secret",XSUS_HYPER_AUDIT_KEY_ID:"audit-v1",
 XSUS_HYPER_ANCHOR_DIRECTORY:"/srv/xsus/anchor",
 XSUS_HYPER_ANCHOR_KEY:"independent-anchor-secret",
 XSUS_HYPER_ANCHOR_KEY_ID:"anchor-v1"
});
describe("XSUS App Hyper deployment configuration gate",()=>{
 it("stays disabled by default",()=>{
  expect(inspect({})).toMatchObject({enabled:false,ready:false});
 });
 it("accepts a complete independent configuration",()=>{
  expect(inspect(valid())).toMatchObject({enabled:true,ready:true,blockers:[]});
 });
 it("rejects each missing required variable",()=>{
  for(const name of Object.keys(valid()).filter(x=>x!=="XSUS_HYPER_APP_ENABLED")){
   const env=valid();delete env[name];
   const result=inspect(env);
   expect(result.ready).toBe(false);
   expect(result.blockers).toContain("MISSING_"+name);
  }
 });
 it("rejects relative audit directory",()=>{
  const result=inspect({...valid(),XSUS_HYPER_AUDIT_DIRECTORY:"./audit"});
  expect(result.blockers).toContain("AUDIT_DIRECTORY_NOT_ABSOLUTE");
 });
 it("rejects relative anchor directory",()=>{
  const result=inspect({...valid(),XSUS_HYPER_ANCHOR_DIRECTORY:"./anchor"});
  expect(result.blockers).toContain("ANCHOR_DIRECTORY_NOT_ABSOLUTE");
 });
 it("rejects identical resolved directories",()=>{
  const result=inspect({...valid(),XSUS_HYPER_ANCHOR_DIRECTORY:"/srv/xsus/audit/../audit"});
  expect(result.blockers).toContain("ANCHOR_AUDIT_DIRECTORY_COLLISION");
 });
 it("rejects reused signing key",()=>{
  const result=inspect({...valid(),XSUS_HYPER_ANCHOR_KEY:"audit-signing-secret"});
  expect(result.blockers).toContain("SIGNING_KEYS_NOT_INDEPENDENT");
 });
 it("rejects malformed Supabase URL",()=>{
  const result=inspect({...valid(),SUPABASE_URL:"http://localhost"});
  expect(result.blockers).toContain("INVALID_SUPABASE_URL");
 });
 it("does not expose secret values",()=>{
  const env={...valid(),XSUS_HYPER_ANCHOR_KEY:"audit-signing-secret"};
  const result=inspect(env);
  expect(JSON.stringify(result)).not.toContain("audit-signing-secret");
 });
 it("freezes results and blockers",()=>{
  const result=inspect(valid());
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.blockers)).toBe(true);
 });
});

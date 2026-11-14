import {describe,it,expect} from "vitest";
import {inspectHyperV819Preflight as inspect} from "../hyper-production-preflight-v819.js";
const ready=()=>({
 XSUS_HYPER_V81_ENABLED:"true",
 SUPABASE_URL:"https://audit-example.supabase.co",
 SUPABASE_SERVICE_ROLE_KEY:"audit-service-secret",
 XSUS_HYPER_V81_AUDIT_KEY:"a".repeat(40),
 XSUS_HYPER_V81_AUDIT_KEY_ID:"audit-v1",
 XSUS_HYPER_CHECKPOINT_URL:"https://checkpoint-example.supabase.co",
 XSUS_HYPER_CHECKPOINT_SERVICE_ROLE_KEY:"checkpoint-service-secret",
 XSUS_HYPER_CHECKPOINT_SIGNING_KEY:"c".repeat(40),
 XSUS_HYPER_CHECKPOINT_KEY_ID:"checkpoint-v1"
});
describe("Hyper v8.1.9 production preflight",()=>{
 it("blocks disabled integration",()=>{
  expect(inspect({...ready(),XSUS_HYPER_V81_ENABLED:"false"}).blockers)
   .toContain("V81_NOT_ENABLED");
 });
 it("accepts complete isolated configuration shape only",()=>{
  expect(inspect(ready())).toMatchObject({configurationReady:true,
   deploymentVerified:false,liveStorageVerified:false});
 });
 it("rejects missing server credentials",()=>{
  const env=ready();delete env.SUPABASE_SERVICE_ROLE_KEY;
  expect(inspect(env).blockers).toContain("MISSING_SUPABASE_SERVICE_ROLE_KEY");
 });
 it("rejects same audit and checkpoint host",()=>{
  expect(inspect({...ready(),XSUS_HYPER_CHECKPOINT_URL:ready().SUPABASE_URL})
   .blockers).toContain("CHECKPOINT_NOT_SEPARATE_PROJECT");
 });
 it("rejects non-HTTPS checkpoint URL",()=>{
  expect(inspect({...ready(),XSUS_HYPER_CHECKPOINT_URL:"http://localhost:54321"})
   .blockers).toContain("INVALID_CHECKPOINT_URL");
 });
 it("rejects short signing keys",()=>{
  expect(inspect({...ready(),XSUS_HYPER_V81_AUDIT_KEY:"short"})
   .blockers).toContain("AUDIT_SIGNING_KEY_TOO_SHORT");
 });
 it("rejects shared signing keys",()=>{
  expect(inspect({...ready(),XSUS_HYPER_CHECKPOINT_SIGNING_KEY:"a".repeat(40)})
   .blockers).toContain("SIGNING_KEYS_NOT_INDEPENDENT");
 });
 it("rejects shared database credentials",()=>{
  expect(inspect({...ready(),
   XSUS_HYPER_CHECKPOINT_SERVICE_ROLE_KEY:"audit-service-secret"})
   .blockers).toContain("DATABASE_CREDENTIALS_NOT_INDEPENDENT");
 });
 it("blocks legacy filesystem route",()=>{
  expect(inspect({...ready(),XSUS_HYPER_APP_ENABLED:"true"})
   .blockers).toContain("LEGACY_FILESYSTEM_HYPER_ROUTE_ENABLED");
 });
 it("never exposes credentials in report",()=>{
  expect(JSON.stringify(inspect(ready()))).not.toContain("audit-service-secret");
 });
 it("does not report deployment verification based on config alone",()=>{
  expect(inspect(ready()).deploymentVerified).toBe(false);
 });
 it("returns immutable report and blockers",()=>{
  const result=inspect({});
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.blockers)).toBe(true);
 });
});

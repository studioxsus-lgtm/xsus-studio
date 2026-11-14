import {describe,it,expect} from "vitest";
import {createSupabaseAuditIntegrity} from "../supabase-audit-integrity-v812.js";
const ZERO="0".repeat(64);
const KEY="a".repeat(40);
const create=(rows=[])=>createSupabaseAuditIntegrity({
 key:KEY,keyId:"audit-v1",storage:{list:async()=>rows}
});
const entry=(signer,sequence,previous_hash,payload)=>({
 event_id:"123e4567-e89b-42d3-a456-426614174000",
 ...signer.signEntry({sequence,previous_hash,payload})
});
describe("Hyper XSUS Core v8.1.2 signed audit chain",()=>{
 it("rejects missing key",()=>expect(()=>createSupabaseAuditIntegrity({
  storage:{list:async()=>[]}})).toThrow(TypeError)),
 it("accepts verified empty chain",async()=>{
  expect(await create().verify()).toMatchObject({verified:true,count:0,tip:ZERO});
 }),
 it("signs and verifies one entry",async()=>{
  const signer=create();
  const first=entry(signer,1,ZERO,{action:"test"});
  expect(await create([first]).verify()).toMatchObject({verified:true,count:1,tip:first.entry_hash});
 }),
 it("verifies a chained pair",async()=>{
  const signer=create();
  const first=entry(signer,1,ZERO,{a:1});
  const second=entry(signer,2,first.entry_hash,{b:2});
  expect((await create([first,second]).verify()).count).toBe(2);
 }),
 it("rejects payload tampering",async()=>{
  const first=entry(create(),1,ZERO,{a:1});
  await expect(create([{...first,payload:{a:2}}]).verify())
   .rejects.toMatchObject({code:"XSUS_SUPABASE_AUDIT_INTEGRITY"});
 }),
 it("rejects hash tampering",async()=>{
  const first=entry(create(),1,ZERO,{a:1});
  await expect(create([{...first,entry_hash:"b".repeat(64)}]).verify())
   .rejects.toMatchObject({code:"XSUS_SUPABASE_AUDIT_INTEGRITY"});
 }),
 it("rejects sequence gaps",async()=>{
  const first=entry(create(),2,ZERO,{a:1});
  await expect(create([first]).verify())
   .rejects.toMatchObject({code:"XSUS_SUPABASE_AUDIT_INTEGRITY"});
 }),
 it("rejects broken previous hash",async()=>{
  const first=entry(create(),1,"c".repeat(64),{a:1});
  await expect(create([first]).verify())
   .rejects.toMatchObject({code:"XSUS_SUPABASE_AUDIT_INTEGRITY"});
 }),
 it("rejects signatures from a different key",async()=>{
  const other=createSupabaseAuditIntegrity({key:"b".repeat(40),keyId:"audit-v1",
   storage:{list:async()=>[]}});
  const first=entry(other,1,ZERO,{a:1});
  await expect(create([first]).verify())
   .rejects.toMatchObject({code:"XSUS_SUPABASE_AUDIT_INTEGRITY"});
 }),
 it("preserves signatures across key ordering",()=>{
  const signer=create();
  expect(signer.signEntry({sequence:1,previous_hash:ZERO,payload:{a:1,b:2}}).entry_hash)
   .toBe(signer.signEntry({sequence:1,previous_hash:ZERO,payload:{b:2,a:1}}).entry_hash);
 }),
 it("fails closed when reader is unavailable",async()=>{
  const verifier=createSupabaseAuditIntegrity({key:KEY,keyId:"audit-v1",
   storage:{list:async()=>{throw new Error("offline");}}});
  await expect(verifier.verify()).rejects.toThrow("offline");
 }),
 it("does not expose the signing key",()=>{
  expect(JSON.stringify(create())).not.toContain(KEY);
 });
});

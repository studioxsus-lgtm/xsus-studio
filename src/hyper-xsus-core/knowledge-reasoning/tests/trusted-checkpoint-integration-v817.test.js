import {describe,it,expect,vi} from "vitest";
import {createTrustedCheckpointIntegration} from "../trusted-checkpoint-integration-v817.js";
import {createTrustedCheckpointProtocol} from "../trusted-checkpoint-v815.js";
import {createSupabaseAuditIntegrity} from "../supabase-audit-integrity-v812.js";
const ZERO="0".repeat(64),AUDIT_KEY="a".repeat(40),CP_KEY="c".repeat(40);
function fixture(){
 const rows=[];
 let persisted;
 const checkpointStorage={
  readCheckpoint:async()=>persisted,
  compareAndSwap:async({expected,next})=>{
   if(persisted.signature!==expected.signature)return false;
   persisted=next;return true;
  }
 };
 const checkpoint=createTrustedCheckpointProtocol({
  key:CP_KEY,keyId:"checkpoint-1",
  readCheckpoint:checkpointStorage.readCheckpoint,
  compareAndSwap:checkpointStorage.compareAndSwap
 });
 persisted=checkpoint.sign(0,ZERO);
 const auditStorage={list:async()=>structuredClone(rows)};
 const signer=createSupabaseAuditIntegrity({
  key:AUDIT_KEY,keyId:"audit-1",storage:auditStorage
 });
 const integration=createTrustedCheckpointIntegration({
  auditStorage,auditKey:AUDIT_KEY,auditKeyId:"audit-1",
  checkpointSigningKey:CP_KEY,checkpointKeyId:"checkpoint-1",
  checkpointStorage
 });
 function add(payload){
  const previous=rows.at(-1);
  const signed=signer.signEntry({sequence:rows.length+1,
   previous_hash:previous?.entry_hash??ZERO,payload});
  rows.push({event_id:"123e4567-e89b-42d3-a456-426614174000",...signed});
 }
 return {integration,rows,add,checkpoint,checkpointStorage,
  setCheckpoint:x=>{persisted=x;},getCheckpoint:()=>persisted};
}
describe("Hyper XSUS Core v8.1.7 signed checkpoint integration",()=>{
 it("requires audit storage",()=>{
  expect(()=>createTrustedCheckpointIntegration()).toThrow(TypeError);
 });
 it("verifies signed empty genesis",async()=>{
  const x=fixture();
  expect(await x.integration.inspect()).toMatchObject({
   verified:true,count:0,recoveryAuthorized:false,safeToResume:false});
 });
 it("requires explicit review for checkpoint advance",async()=>{
  const x=fixture();x.add({action:"append"});
  await expect(x.integration.advanceReviewed()).rejects.toMatchObject({
   code:"XSUS_CHECKPOINT_REVIEW_REQUIRED"});
 });
 it("rejects reviewer denial",async()=>{
  const x=fixture();x.add({action:"append"});
  await expect(x.integration.advanceReviewed({authorize:async()=>false}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_REVIEW_DENIED"});
 });
 it("advances exactly one signed audit record with review",async()=>{
  const x=fixture();x.add({action:"append"});
  const result=await x.integration.advanceReviewed({authorize:async()=>true});
  expect(result).toMatchObject({count:1,verified:true,recoveryAuthorized:false});
  expect((await x.integration.inspect()).verified).toBe(true);
 });
 it("blocks multiple pending records",async()=>{
  const x=fixture();x.add({n:1});x.add({n:2});
  await expect(x.integration.advanceReviewed({authorize:async()=>true}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_ADVANCE_NOT_SINGLE_STEP"});
 });
 it("blocks tampered audit",async()=>{
  const x=fixture();x.add({n:1});x.rows[0].payload={n:999};
  await expect(x.integration.advanceReviewed({authorize:async()=>true}))
   .rejects.toMatchObject({code:"XSUS_SUPABASE_AUDIT_INTEGRITY"});
 });
 it("blocks forged signed checkpoint",async()=>{
  const x=fixture();x.setCheckpoint({...x.getCheckpoint(),count:3});
  expect((await x.integration.inspect()).verified).toBe(false);
 });
 it("fails closed if checkpoint service is down",async()=>{
  const x=fixture();
  x.checkpointStorage.readCheckpoint=async()=>{throw Error("offline");};
  // Integration captures the original storage function, so use a new instance.
  const broken=createTrustedCheckpointIntegration({
   auditStorage:{list:async()=>[]},auditKey:AUDIT_KEY,auditKeyId:"audit-1",
   checkpointSigningKey:CP_KEY,checkpointKeyId:"checkpoint-1",
   checkpointStorage:{readCheckpoint:async()=>{throw Error("offline");},
    compareAndSwap:async()=>false}
  });
  expect((await broken.inspect()).verified).toBe(false);
 });
 it("does not leak either signing key",async()=>{
  const x=fixture();
  const output=JSON.stringify(await x.integration.inspect());
  expect(output).not.toContain(AUDIT_KEY);
  expect(output).not.toContain(CP_KEY);
 });
 it("does not authorize recovery after successful advancement",async()=>{
  const x=fixture();x.add({n:1});
  await x.integration.advanceReviewed({authorize:async()=>true});
  expect(await x.integration.inspect()).toMatchObject({
   recoveryAuthorized:false,safeToResume:false});
 });
});

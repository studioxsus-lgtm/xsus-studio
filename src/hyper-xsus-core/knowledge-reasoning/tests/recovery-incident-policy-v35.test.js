import {describe,it,expect} from "vitest";
import {createRecoveryIncidentPolicy} from "../recovery-incident-policy.js";
const snapshot={lastSequence:10,entries:[{sequence:10,hash:"a".repeat(64)}]};
function setup({mark=10,inventory=[],observed=[],lock="absent",verifyError=null,
 mutate=false,diagnosticMismatch=false}={}){
 let reads=0,verified=0;
 const highWater={read:async()=>{reads++;return mutate&&reads>2?mark+1:mark;}};
 const expected={read:async()=>[...inventory]};
 const receipts={list:async()=>[...observed]};
 const assessor={assess:async()=>({
  sequence:diagnosticMismatch?mark+1:mark,lock,
  missingReceipts:inventory.filter(n=>!observed.includes(n)),
  unexpectedReceipts:observed.filter(n=>!inventory.includes(n))
 })};
 const consistency={inspect:async()=>{verified++;if(verifyError)throw Object.assign(Error("integrity"),{code:verifyError});return {status:"verified"};}};
 const policy=createRecoveryIncidentPolicy({assessor,consistency,highWater,expected,receipts});
 return {policy,get verified(){return verified;}};
}
describe("Hyper Audit v3.5 — incident policy matrix",()=>{
 for(const [name,opts,blockers] of [
  ["clean state",{inventory:[],observed:[]},[]],
  ["one valid receipt",{inventory:[2],observed:[2]},[]],
  ["multiple valid receipts",{inventory:[2,4,8],observed:[2,4,8]},[]],
  ["stale lock",{lock:"present"},["LOCK_REVIEW_REQUIRED"]],
  ["missing receipt",{inventory:[2]},["MISSING_RECOVERY_RECEIPTS"]],
  ["unexpected receipt",{observed:[2]},["UNEXPECTED_RECOVERY_RECEIPTS"]],
  ["both missing and unexpected",{inventory:[2],observed:[3]},["MISSING_RECOVERY_RECEIPTS","UNEXPECTED_RECOVERY_RECEIPTS"]],
  ["lock plus missing",{lock:"present",inventory:[2]},["LOCK_REVIEW_REQUIRED","MISSING_RECOVERY_RECEIPTS"]],
  ["lock plus unexpected",{lock:"present",observed:[3]},["LOCK_REVIEW_REQUIRED","UNEXPECTED_RECOVERY_RECEIPTS"]],
  ["all three blockers",{lock:"present",inventory:[2],observed:[3]},["LOCK_REVIEW_REQUIRED","MISSING_RECOVERY_RECEIPTS","UNEXPECTED_RECOVERY_RECEIPTS"]],
  ["partial inventory overlap",{inventory:[2,4],observed:[2]},["MISSING_RECOVERY_RECEIPTS"]],
  ["partial unexpected overlap",{inventory:[2],observed:[2,4]},["UNEXPECTED_RECOVERY_RECEIPTS"]],
  ["high sequence",{mark:100,inventory:[2,40,99],observed:[2,40,99]},[]],
  ["zero sequence",{mark:0},[]]
 ]){
  it(name,async()=>{
   const f=setup(opts);const r=await f.policy.evaluate(snapshot);
   expect(r.blockers).toEqual(blockers);
   expect(r.safeToResume).toBe(blockers.length===0);
   expect(r.status).toBe(blockers.length?"manual-intervention-required":"verified");
   expect(f.verified).toBe(blockers.length?0:1);
  });
 }
 for(const [name,opts,code] of [
  ["negative mark",{mark:-1},"XSUS_INCIDENT_STATE_INVALID"],
  ["fractional mark",{mark:1.5},"XSUS_INCIDENT_STATE_INVALID"],
  ["duplicate inventory",{inventory:[2,2]},"XSUS_INCIDENT_STATE_INVALID"],
  ["unsorted inventory",{inventory:[4,2]},"XSUS_INCIDENT_STATE_INVALID"],
  ["duplicate receipts",{observed:[2,2]},"XSUS_INCIDENT_STATE_INVALID"],
  ["unsorted receipts",{observed:[4,2]},"XSUS_INCIDENT_STATE_INVALID"],
  ["inventory ahead",{inventory:[11]},"XSUS_INCIDENT_STATE_INVALID"],
  ["receipt ahead",{observed:[11]},"XSUS_INCIDENT_STATE_INVALID"],
  ["diagnostic mismatch",{diagnosticMismatch:true},"XSUS_INCIDENT_STATE_CHANGED"],
  ["changed high water",{mutate:true},"XSUS_INCIDENT_STATE_CHANGED"],
  ["invalid signed evidence",{verifyError:"XSUS_RECOVERY_RECEIPT_SIGNATURE"},"XSUS_RECOVERY_RECEIPT_SIGNATURE"]
 ]){
  it("fails closed: "+name,async()=>{
   await expect(setup(opts).policy.evaluate(snapshot)).rejects.toMatchObject({code});
  });
 }
 it("does not silently trust a clean diagnostic when signature verification fails",async()=>{
  const f=setup({inventory:[2],observed:[2],verifyError:"XSUS_RECOVERY_RECEIPT_FORK"});
  await expect(f.policy.evaluate(snapshot)).rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_FORK"});
  expect(f.verified).toBe(1);
 });
 it("rejects missing dependencies",()=>{
  expect(()=>createRecoveryIncidentPolicy({})).toThrow(TypeError);
 });
 it("returns frozen incident reports",async()=>{
  const r=await setup({inventory:[2],observed:[]}).policy.evaluate(snapshot);
  expect(Object.isFrozen(r)).toBe(true);
  expect(Object.isFrozen(r.blockers)).toBe(true);
  expect(Object.isFrozen(r.missingReceipts)).toBe(true);
 });
});

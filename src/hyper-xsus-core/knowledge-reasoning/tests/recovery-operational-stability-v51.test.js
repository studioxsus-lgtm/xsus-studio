import {describe,it,expect} from "vitest";
import {createRecoveryOperationalReport} from "../recovery-operational-report.js";
const zero="0".repeat(64);
const one="1".repeat(64);
const mark=(count=0,tip=zero)=>({count,tip});
const archive=(count=0,tip=zero)=>({count,tip,entries:count?[{sequence:1,signature:tip}]:[]});
const readiness=(count=0,tip=zero)=>({
 safeToResume:true,blockers:[],
 core:{archiveCount:count,archiveTip:tip,trustedCount:count,trustedTip:tip}
});
function make({inspectReadiness=async()=>readiness(),verifyArchive=async()=>archive(),readCheckpoint=async()=>mark()}={}){
 return createRecoveryOperationalReport({inspectReadiness,verifyArchive,readCheckpoint});
}
describe("Hyper Audit v5.1 — operational snapshot stability",()=>{
 it("rejects a checkpoint changed after the second readiness assessment",async()=>{
  let reads=0;
  const r=make({readCheckpoint:async()=>++reads===1?mark():mark(1,one)});
  await expect(r.assess()).rejects.toMatchObject({code:"XSUS_RECOVERY_OPERATIONAL_CHANGED"});
  expect(reads).toBe(2);
 });
 it("rejects an archive appended after the second readiness assessment",async()=>{
  let reads=0;
  const r=make({verifyArchive:async()=>++reads===1?archive():archive(1,one)});
  await expect(r.assess()).rejects.toMatchObject({code:"XSUS_RECOVERY_OPERATIONAL_CHANGED"});
  expect(reads).toBe(2);
 });
 it("rejects a changed archive evidence signature even with the same count and tip",async()=>{
  let reads=0;
  const signed=archive(1,one);
  const changed={...signed,entries:[{sequence:1,signature:"2".repeat(64)}]};
  const r=make({
   inspectReadiness:async()=>readiness(1,one),
   readCheckpoint:async()=>mark(1,one),
   verifyArchive:async()=>++reads===1?signed:changed
  });
  await expect(r.assess()).rejects.toMatchObject({code:"XSUS_RECOVERY_OPERATIONAL_CHANGED"});
 });
 it("accepts a stable authenticated state across both reads",async()=>{
  let checks=0,archives=0,checkpoints=0;
  const r=make({
   inspectReadiness:async()=>{checks++;return readiness(1,one);},
   readCheckpoint:async()=>{checkpoints++;return mark(1,one);},
   verifyArchive:async()=>{archives++;return archive(1,one);}
  });
  const result=await r.assess();
  expect(result).toMatchObject({status:"ready",safeToResume:true,archive:{count:1},checkpoint:{count:1}});
  expect([checks,archives,checkpoints]).toEqual([2,2,2]);
 });
 it("does not convert a blocked assessment into ready after stable rechecks",async()=>{
  const r=make({inspectReadiness:async()=>({...readiness(),safeToResume:false,blockers:["MANUAL_REVIEW"]})});
  const result=await r.assess();
  expect(result).toMatchObject({status:"manual-intervention-required",safeToResume:false,blockers:["MANUAL_REVIEW"]});
 });
 it("preserves underlying storage read failures",async()=>{
  const error=Object.assign(new Error("disk unavailable"),{code:"EIO"});
  const r=make({readCheckpoint:async()=>{throw error;}});
  await expect(r.assess()).rejects.toBe(error);
 });
});

import {describe,it,expect} from "vitest";
import {createRecoveryAssurance} from "../recovery-assurance-v80.js";
const Z="0".repeat(64);
const healthy=(count=0)=>({status:"ready",safeToResume:true,blockers:[],
 anchor:{count,tip:Z},audit:{count,tip:Z}});
const run=(inspectHealth,rounds=3)=>createRecoveryAssurance({inspectHealth,rounds}).assess();

describe("Hyper XSUS Core v8.0 — multi-round assurance contract",()=>{
 it("accepts three consistent rounds with twelve observations",async()=>{
  let calls=0;
  const result=await run(async()=>{calls++;return healthy();});
  expect(calls).toBe(12);
  expect(result).toMatchObject({version:"8.0.0",safeToResume:true,consistent:true,rounds:3,completed:3});
 });
 it("supports the maximum eight rounds",async()=>{
  let calls=0;
  const result=await run(async()=>{calls++;return healthy();},8);
  expect(result.safeToResume).toBe(true);
  expect(calls).toBe(32);
 });
 it("rejects a cross-round change despite stable individual rounds",async()=>{
  let calls=0;
  const result=await run(async()=>healthy(Math.floor(calls++/4)));
  expect(result.safeToResume).toBe(false);
  expect(result.blockers).toContain("RECOVERY_ASSURANCE_CROSS_ROUND_CHANGED");
  expect(result.anchor).toBe(null);
 });
 it("rejects an early blocked round even when later rounds are healthy",async()=>{
  let calls=0;
  const result=await run(async()=>{
   const x=healthy();
   if(calls++<4)x.blockers.push("MANUAL_REVIEW");
   return x;
  });
  expect(result.safeToResume).toBe(false);
  expect(result.blockers).toContain("RECOVERY_ASSURANCE_ROUND_BLOCKED");
 });
 it("rejects a final blocked round after earlier healthy rounds",async()=>{
  let calls=0;
  const result=await run(async()=>{
   const x=healthy();
   if(calls++>=8)x.status="blocked";
   return x;
  });
  expect(result.safeToResume).toBe(false);
  expect(result.completed).toBe(3);
 });
 it("rejects every blocked round without a baseline",async()=>{
  const result=await run(async()=>({...healthy(),status:"blocked"}));
  expect(result.safeToResume).toBe(false);
  expect(result.blockers).toContain("RECOVERY_ASSURANCE_NO_STABLE_BASELINE");
 });
 it("rejects an in-round change",async()=>{
  let calls=0;
  const result=await run(async()=>healthy(calls++));
  expect(result.safeToResume).toBe(false);
  expect(result.blockers).toContain("RECOVERY_ASSURANCE_ROUND_BLOCKED");
 });
 it("rejects known integrity exceptions without granting readiness",async()=>{
  const result=await run(async()=>{throw Object.assign(new Error("signature"),{code:"XSUS_CHECKPOINT_SIGNATURE"});});
  expect(result.safeToResume).toBe(false);
 });
 it("propagates unexpected disk errors",async()=>{
  await expect(run(async()=>{throw Object.assign(new Error("disk"),{code:"EIO"});})).rejects.toMatchObject({code:"EIO"});
 });
 it("freezes successful reports and marks",async()=>{
  const x=await run(async()=>healthy());
  expect(Object.isFrozen(x)).toBe(true);
  expect(Object.isFrozen(x.blockers)).toBe(true);
  expect(Object.isFrozen(x.anchor)).toBe(true);
  expect(Object.isFrozen(x.audit)).toBe(true);
 });
 it("freezes blocked reports and withholds marks",async()=>{
  const x=await run(async()=>({...healthy(),status:"blocked"}));
  expect(Object.isFrozen(x)).toBe(true);
  expect(Object.isFrozen(x.blockers)).toBe(true);
  expect(x.anchor).toBe(null);
  expect(x.audit).toBe(null);
 });
 it("requires an inspector",()=>{
  expect(()=>createRecoveryAssurance()).toThrow(TypeError);
 });
 it("rejects invalid round limits",()=>{
  for(const rounds of [0,1,9,2.5,NaN,Infinity,"3",null]){
   expect(()=>createRecoveryAssurance({inspectHealth:async()=>healthy(),rounds})).toThrow(RangeError);
  }
 });
 it("allows the minimum two rounds",async()=>{
  let calls=0;
  const x=await run(async()=>{calls++;return healthy();},2);
  expect(x.safeToResume).toBe(true);
  expect(calls).toBe(8);
 });
});

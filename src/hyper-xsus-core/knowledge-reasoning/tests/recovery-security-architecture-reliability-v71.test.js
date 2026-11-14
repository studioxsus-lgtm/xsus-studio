import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createRecoverySecurityArchitecture} from "../recovery-security-architecture-v70.js";

const ZERO="0".repeat(64);
const healthy=(count=0)=>({status:"ready",safeToResume:true,blockers:[],
 anchor:{count,tip:ZERO},audit:{count,tip:ZERO}});
const check=inspectHealth=>createRecoverySecurityArchitecture({inspectHealth}).assess();

async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-architecture-v71-"));
 const directory=join(root,"anchor"),auditDirectory=join(root,"audit");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"v71-audit",maxEntries:200});
 const anchor=createTrustedRecoveryAuditAnchor({directory,key:"b".repeat(48),keyId:"v71-anchor",
  auditDirectory,readDurableAudit:()=>audit.read(),authorize:async()=>true});
 const inspect=()=>anchor.inspectHealth();
 try{
  await audit.initialize();
  await anchor.initialize();
  await run({audit,anchor,inspect,directory,auditDirectory});
 }finally{
  await rm(root,{recursive:true,force:true});
 }
}

describe("Hyper XSUS Core v7.1 — architecture reliability and fault stress",()=>{
 it("survives 50 consecutive four-pass signed security assessments",async()=>fixture(async({inspect})=>{
  for(let i=0;i<50;i++){
   const report=await check(inspect);
   expect(report.safeToResume).toBe(true);
   expect(report.consistent).toBe(true);
  }
 }),90000);

 it("validates 25 sequential authenticated append and anchor advances",async()=>fixture(async({audit,anchor,inspect})=>{
  for(let i=1;i<=25;i++){
   await audit.append({i});
   await anchor.advance();
   const report=await check(inspect);
   expect(report.safeToResume).toBe(true);
   expect(report.anchor.count).toBe(i);
  }
 }),90000);

 it("handles 40 parallel read-only assessments on a stable checkpoint",async()=>fixture(async({audit,anchor,inspect})=>{
  for(let i=0;i<4;i++)await audit.append({i});
  await anchor.advance();
  const reports=await Promise.all(Array.from({length:40},()=>check(inspect)));
  expect(reports.every(x=>x.safeToResume&&x.anchor.count===4)).toBe(true);
 }),90000);

 it("rejects a change exactly between verification phases",async()=>{
  let calls=0;
  const report=await check(async()=>healthy(calls++<2?0:1));
  expect(calls).toBe(4);
  expect(report.safeToResume).toBe(false);
  expect(report.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });

 it("rejects an audit mark changing only on the fourth observation",async()=>{
  let calls=0;
  const report=await check(async()=>{
   const x=healthy();
   if(++calls===4)x.audit.tip="f".repeat(64);
   return x;
  });
  expect(report.safeToResume).toBe(false);
  expect(report.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });

 it("rejects a malformed health result in the operational phase",async()=>{
  let calls=0;
  const report=await check(async()=>++calls===1?null:healthy());
  expect(report.safeToResume).toBe(false);
  expect(report.blockers).toContain("OPERATIONAL_HEALTH_NOT_READY");
 });

 it("rejects an explicit blocker in the security phase",async()=>{
  let calls=0;
  const report=await check(async()=>{
   const x=healthy();
   if(++calls===3)x.blockers.push("MANUAL_REVIEW");
   return x;
  });
  expect(report.safeToResume).toBe(false);
  expect(report.blockers).toContain("SECURITY_HEALTH_INVALID");
 });

 it("fails closed for a known checkpoint integrity error",async()=>{
  const report=await check(async()=>{
   throw Object.assign(new Error("signature"),{code:"XSUS_CHECKPOINT_SIGNATURE"});
  });
  expect(report.safeToResume).toBe(false);
  expect(report.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });

 it("propagates unexpected disk errors",async()=>{
  await expect(check(async()=>{
   throw Object.assign(new Error("disk failure"),{code:"EIO"});
  })).rejects.toMatchObject({code:"EIO"});
 });

 it("preserves pending checkpoint evidence across 15 blocked checks",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.pending");
  await writeFile(file,"manual-review");
  for(let i=0;i<15;i++)expect((await check(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("manual-review");
 }),90000);

 it("preserves a checkpoint writer lock across 15 blocked checks",async()=>fixture(async({directory,inspect})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  for(let i=0;i<15;i++)expect((await check(inspect)).safeToResume).toBe(false);
 }),90000);

 it("detects signed audit rollback repeatedly",async()=>fixture(async({audit,anchor,auditDirectory,inspect})=>{
  await audit.append({i:1});
  const file=join(auditDirectory,"audit.json");
  const old=await readFile(file,"utf8");
  await audit.append({i:2});
  await anchor.advance();
  await writeFile(file,old);
  for(let i=0;i<10;i++)expect((await check(inspect)).safeToResume).toBe(false);
 }),90000);

 it("keeps all public result structures frozen",async()=>{
  const result=await check(async()=>healthy());
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.blockers)).toBe(true);
  expect(Object.isFrozen(result.anchor)).toBe(true);
  expect(Object.isFrozen(result.audit)).toBe(true);
 });

 it("rejects a missing health inspector at construction",()=>{
  expect(()=>createRecoverySecurityArchitecture()).toThrow(TypeError);
 });
});

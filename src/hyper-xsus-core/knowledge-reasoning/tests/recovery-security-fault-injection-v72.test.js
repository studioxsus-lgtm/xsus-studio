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
 const root=await mkdtemp(join(tmpdir(),"xsus-fault-v72-"));
 const directory=join(root,"anchor"),auditDirectory=join(root,"audit");
 const audit=createDurableRecoveryAudit({
  directory:auditDirectory,key:"a".repeat(48),keyId:"v72-audit",maxEntries:200
 });
 const anchor=createTrustedRecoveryAuditAnchor({
  directory,key:"b".repeat(48),keyId:"v72-anchor",
  auditDirectory,readDurableAudit:()=>audit.read(),authorize:async()=>true
 });
 try{
  await audit.initialize();
  await anchor.initialize();
  await run({audit,anchor,directory,auditDirectory,inspect:()=>anchor.inspectHealth()});
 }finally{
  await rm(root,{recursive:true,force:true});
 }
}

describe("Hyper XSUS Core v7.2 — recovery security fault injection and resilience",()=>{
 it("rejects a checkpoint signature modification",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.json");
  const record=JSON.parse(await readFile(file,"utf8"));
  record.count=3;
  await writeFile(file,JSON.stringify(record));
  const result=await check(inspect);
  expect(result.safeToResume).toBe(false);
  expect(result.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 }));

 it("rejects a signed audit payload modification",async()=>fixture(async({audit,auditDirectory,inspect})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json");
  const record=JSON.parse(await readFile(file,"utf8"));
  record.entries[0].payload.id=99;
  await writeFile(file,JSON.stringify(record));
  expect((await check(inspect)).safeToResume).toBe(false);
 }));

 it("rejects rollback behind a previously advanced anchor",async()=>fixture(async({audit,anchor,auditDirectory,inspect})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json");
  const earlier=await readFile(file,"utf8");
  await audit.append({id:2});
  await anchor.advance();
  await writeFile(file,earlier);
  const result=await check(inspect);
  expect(result.safeToResume).toBe(false);
  expect(result.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 }));

 it("preserves checkpoint pending evidence after repeated failures",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.pending");
  await writeFile(file,"incident-evidence");
  for(let i=0;i<12;i++)expect((await check(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("incident-evidence");
 }),90000);

 it("preserves checkpoint writer lock during blocked inspections",async()=>fixture(async({directory,inspect})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  for(let i=0;i<12;i++)expect((await check(inspect)).safeToResume).toBe(false);
 }),90000);

 it("preserves audit pending evidence during blocked inspections",async()=>fixture(async({auditDirectory,inspect})=>{
  const file=join(auditDirectory,"audit.pending");
  await writeFile(file,"audit-evidence");
  for(let i=0;i<12;i++)expect((await check(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("audit-evidence");
 }),90000);

 it("rejects a health transition exactly between independent verifiers",async()=>{
  let calls=0;
  const result=await check(async()=>healthy(calls++<2?0:1));
  expect(calls).toBe(4);
  expect(result.safeToResume).toBe(false);
  expect(result.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });

 it("rejects an injected blocker in the fourth observation",async()=>{
  let calls=0;
  const result=await check(async()=>{
   const report=healthy();
   if(++calls===4)report.blockers.push("INCIDENT_REVIEW");
   return report;
  });
  expect(result.safeToResume).toBe(false);
  expect(result.blockers).toContain("SECURITY_HEALTH_INVALID");
 });

 it("rejects an injected known integrity error on the third observation",async()=>{
  let calls=0;
  const result=await check(async()=>{
   if(++calls===3)throw Object.assign(new Error("signature"),{code:"XSUS_CHECKPOINT_SIGNATURE"});
   return healthy();
  });
  expect(result.safeToResume).toBe(false);
  expect(result.blockers).toContain("SECURITY_INSPECTION_ERROR");
 });

 it("propagates unexpected I/O faults without reporting ready",async()=>{
  let calls=0;
  await expect(check(async()=>{
   if(++calls===3)throw Object.assign(new Error("storage failure"),{code:"EIO"});
   return healthy();
  })).rejects.toMatchObject({code:"EIO"});
 });

 it("rejects a changed audit tip on the last observation",async()=>{
  let calls=0;
  const result=await check(async()=>{
   const report=healthy();
   if(++calls===4)report.audit.tip="f".repeat(64);
   return report;
  });
  expect(result.safeToResume).toBe(false);
  expect(result.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });

 it("restores readiness only after a transient synthetic fault clears",async()=>{
  let fail=true;
  const inspect=async()=>fail?{...healthy(),blockers:["MANUAL_REVIEW"]}:healthy();
  expect((await check(inspect)).safeToResume).toBe(false);
  fail=false;
  const result=await check(inspect);
  expect(result.safeToResume).toBe(true);
  expect(result.consistent).toBe(true);
 });

 it("keeps blocked reports immutable and without trusted marks",async()=>{
  const result=await check(async()=>({...healthy(),status:"blocked"}));
  expect(result.safeToResume).toBe(false);
  expect(result.anchor).toBe(null);
  expect(result.audit).toBe(null);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.blockers)).toBe(true);
 });
});

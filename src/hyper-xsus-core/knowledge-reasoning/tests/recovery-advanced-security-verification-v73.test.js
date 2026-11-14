import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createRecoverySecurityArchitecture} from "../recovery-security-architecture-v70.js";

const ZERO="0".repeat(64);
const healthy=(count=0,tip=ZERO)=>({
 status:"ready",safeToResume:true,blockers:[],
 anchor:{count,tip},audit:{count,tip}
});
const verify=inspectHealth=>createRecoverySecurityArchitecture({inspectHealth}).assess();

async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-security-v73-"));
 const directory=join(root,"anchor"),auditDirectory=join(root,"audit");
 const audit=createDurableRecoveryAudit({
  directory:auditDirectory,key:"a".repeat(48),keyId:"v73-audit",maxEntries:200
 });
 const anchor=createTrustedRecoveryAuditAnchor({
  directory,key:"b".repeat(48),keyId:"v73-anchor",
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

describe("Hyper XSUS Core v7.3 — advanced recovery security verification",()=>{
 it("accepts 20 stable authenticated assessments after advancement",async()=>fixture(async({audit,anchor,inspect})=>{
  for(let i=1;i<=5;i++)await audit.append({i});
  await anchor.advance();
  for(let i=0;i<20;i++){
   const report=await verify(inspect);
   expect(report.safeToResume).toBe(true);
   expect(report.anchor.count).toBe(5);
  }
 }),90000);

 it("supports 30 parallel read-only assessments of authenticated state",async()=>fixture(async({inspect})=>{
  const results=await Promise.all(Array.from({length:30},()=>verify(inspect)));
  expect(results.every(x=>x.safeToResume&&x.consistent)).toBe(true);
 }),90000);

 it("detects audit tampering even when checkpoint is intact",async()=>fixture(async({audit,auditDirectory,inspect})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json");
  const record=JSON.parse(await readFile(file,"utf8"));
  record.entries[0].payload.id=999;
  await writeFile(file,JSON.stringify(record));
  expect((await verify(inspect)).safeToResume).toBe(false);
 }));

 it("detects checkpoint tampering even when audit is intact",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.json");
  const record=JSON.parse(await readFile(file,"utf8"));
  record.count=7;
  await writeFile(file,JSON.stringify(record));
  expect((await verify(inspect)).safeToResume).toBe(false);
 }));

 it("rejects a changed mark between operational and security verification",async()=>{
  let calls=0;
  const report=await verify(async()=>healthy(calls++<2?0:1));
  expect(report.safeToResume).toBe(false);
  expect(report.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });

 it("rejects an audit tip changed only in the final observation",async()=>{
  let calls=0;
  const report=await verify(async()=>healthy(0,++calls===4?"f".repeat(64):ZERO));
  expect(report.safeToResume).toBe(false);
  expect(report.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });

 it("rejects forged readiness with nonempty blockers",async()=>{
  const report=await verify(async()=>({...healthy(),blockers:["REVIEW_REQUIRED"]}));
  expect(report.safeToResume).toBe(false);
  expect(report.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });

 it("rejects an invalid audit count without authorization",async()=>{
  const report=await verify(async()=>({...healthy(),audit:{count:-1,tip:ZERO}}));
  expect(report.safeToResume).toBe(false);
  expect(report.anchor).toBe(null);
 });

 it("preserves audit pending evidence during repeated verification",async()=>fixture(async({auditDirectory,inspect})=>{
  const file=join(auditDirectory,"audit.pending");
  await writeFile(file,"manual-review");
  for(let i=0;i<10;i++)expect((await verify(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("manual-review");
 }),90000);

 it("preserves checkpoint lock evidence during repeated verification",async()=>fixture(async({directory,inspect})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  for(let i=0;i<10;i++)expect((await verify(inspect)).safeToResume).toBe(false);
 }),90000);

 it("fails closed on a known integrity exception during the security phase",async()=>{
  let calls=0;
  const report=await verify(async()=>{
   if(++calls===3)throw Object.assign(new Error("signature"),{code:"XSUS_CHECKPOINT_SIGNATURE"});
   return healthy();
  });
  expect(report.safeToResume).toBe(false);
  expect(report.blockers).toContain("SECURITY_INSPECTION_ERROR");
 });

 it("propagates unexpected storage errors during security verification",async()=>{
  let calls=0;
  await expect(verify(async()=>{
   if(++calls===3)throw Object.assign(new Error("storage"),{code:"EIO"});
   return healthy();
  })).rejects.toMatchObject({code:"EIO"});
 });
});

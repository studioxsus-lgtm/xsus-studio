import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,mkdir,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createRecoveryOperationalVerification} from "../recovery-operational-verification-v65.js";
const ZERO="0".repeat(64);
async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-fault-resilience-v67-"));
 const auditDirectory=join(root,"audit"),directory=join(root,"anchor");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"v67-audit",maxEntries:200});
 const config={directory,key:"b".repeat(48),keyId:"v67-anchor",auditDirectory,
  readDurableAudit:()=>audit.read(),authorize:async()=>true};
 const anchor=createTrustedRecoveryAuditAnchor(config);
 const verify=()=>createRecoveryOperationalVerification({inspectHealth:()=>anchor.inspectHealth()}).assess();
 try{await audit.initialize();await anchor.initialize();await run({audit,anchor,verify,directory,auditDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v6.7 — operational security and fault resilience",()=>{
 it("remains ready after 25 authenticated advancement cycles",async()=>fixture(async({audit,anchor,verify})=>{
  for(let i=1;i<=25;i++){
   await audit.append({i});await anchor.advance();
   const x=await verify();
   expect(x.safeToResume).toBe(true);
   expect(x.anchor.count).toBe(i);
  }
 }),90000);
 it("detects checkpoint tampering in operational verification",async()=>fixture(async({directory,verify})=>{
  const file=join(directory,"checkpoint.json");
  const value=JSON.parse(await readFile(file,"utf8"));value.count=1;value.tip="f".repeat(64);
  await writeFile(file,JSON.stringify(value));
  const x=await verify();
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("ANCHOR_INTEGRITY_REVIEW_REQUIRED");
 }));
 it("detects audit payload tampering in operational verification",async()=>fixture(async({audit,auditDirectory,verify})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json");
  const value=JSON.parse(await readFile(file,"utf8"));value.entries[0].payload.id=2;
  await writeFile(file,JSON.stringify(value));
  const x=await verify();
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("AUDIT_INTEGRITY_REVIEW_REQUIRED");
 }));
 it("preserves checkpoint pending evidence after repeated blocked verifications",async()=>fixture(async({directory,verify})=>{
  const file=join(directory,"checkpoint.pending");await writeFile(file,"review-required");
  for(let i=0;i<20;i++)expect((await verify()).blockers).toContain("ANCHOR_PENDING_REVIEW_REQUIRED");
  expect(await readFile(file,"utf8")).toBe("review-required");
 }),90000);
 it("preserves checkpoint lock after repeated blocked verifications",async()=>fixture(async({directory,verify})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  for(let i=0;i<20;i++)expect((await verify()).blockers).toContain("ANCHOR_WRITER_LOCK_REVIEW_REQUIRED");
 }),90000);
 it("preserves audit pending evidence after repeated blocked verifications",async()=>fixture(async({auditDirectory,verify})=>{
  const file=join(auditDirectory,"audit.pending");await writeFile(file,"audit-review");
  for(let i=0;i<20;i++)expect((await verify()).blockers).toContain("AUDIT_PENDING_REVIEW_REQUIRED");
  expect(await readFile(file,"utf8")).toBe("audit-review");
 }),90000);
 it("detects signed rollback after anchor advancement",async()=>fixture(async({audit,anchor,auditDirectory,verify})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json"),previous=await readFile(file,"utf8");
  await audit.append({id:2});await anchor.advance();await writeFile(file,previous);
  const x=await verify();
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("AUDIT_ROLLBACK_REVIEW_REQUIRED");
 }));
 it("rejects a health state changing between two observations",async()=>{
  let count=0;
  const inspector=async()=>({safeToResume:true,status:"ready",blockers:[],
   anchor:{count:count++,tip:ZERO},audit:{count:5,tip:ZERO}});
  const x=await createRecoveryOperationalVerification({inspectHealth:inspector}).assess();
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("OPERATIONAL_STATE_CHANGED");
 });
 it("does not silently treat a known integrity exception as ready",async()=>{
  const x=await createRecoveryOperationalVerification({inspectHealth:async()=>{
   throw Object.assign(new Error("integrity failure"),{code:"XSUS_CHECKPOINT_SIGNATURE"});
  }}).assess();
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("OPERATIONAL_INSPECTION_ERROR");
 });
 it("propagates unexpected storage errors instead of reporting readiness",async()=>{
  await expect(createRecoveryOperationalVerification({inspectHealth:async()=>{
   throw Object.assign(new Error("disk I/O failure"),{code:"EIO"});
  }}).assess()).rejects.toMatchObject({code:"EIO"});
 });
});

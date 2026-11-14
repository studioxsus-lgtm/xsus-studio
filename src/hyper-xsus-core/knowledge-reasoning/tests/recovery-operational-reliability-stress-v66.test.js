import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,mkdir,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createRecoveryOperationalVerification} from "../recovery-operational-verification-v65.js";
const Z="0".repeat(64);
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-operation-stress-v66-"));
 const auditDirectory=join(root,"audit"),directory=join(root,"anchor");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"v66-audit",maxEntries:200});
 const config={directory,key:"b".repeat(48),keyId:"v66-anchor",auditDirectory,
  readDurableAudit:()=>audit.read(),authorize:async()=>true};
 const anchor=createTrustedRecoveryAuditAnchor(config);
 const fresh=()=>createRecoveryOperationalVerification({inspectHealth:()=>createTrustedRecoveryAuditAnchor(config).inspectHealth()});
 try{await audit.initialize();await anchor.initialize();await fn({audit,anchor,fresh,directory,auditDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v6.6 — operational reliability and stress",()=>{
 it("passes 60 consecutive stable operational verifications",async()=>fixture(async({fresh})=>{
  for(let i=0;i<60;i++){
   const x=await fresh().assess();
   expect(x.safeToResume).toBe(true);
   expect(x.stable).toBe(true);
   expect(x.anchor.count).toBe(0);
  }
 }),90000);
 it("passes 60 authenticated audit and anchor advancement cycles",async()=>fixture(async({audit,anchor,fresh})=>{
  for(let i=1;i<=60;i++){
   await audit.append({cycle:i});
   await anchor.advance();
   const x=await fresh().assess();
   expect(x.safeToResume).toBe(true);
   expect(x.anchor.count).toBe(i);
   expect(x.audit.count).toBe(i);
  }
 }),120000);
 it("supports 80 parallel read-only operational checks",async()=>fixture(async({audit,anchor,fresh})=>{
  for(let i=0;i<10;i++)await audit.append({i});
  await anchor.advance();
  const reports=await Promise.all(Array.from({length:80},()=>fresh().assess()));
  expect(reports.every(x=>x.safeToResume&&x.stable&&x.anchor.count===10)).toBe(true);
 }),90000);
 it("fails closed when anchor changes between two health reads",async()=>{
  let n=0;
  const inspectHealth=async()=>({safeToResume:true,status:"ready",blockers:[],
   anchor:{count:n++,tip:Z},audit:{count:5,tip:Z}});
  const x=await createRecoveryOperationalVerification({inspectHealth}).assess();
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("OPERATIONAL_STATE_CHANGED");
 });
 it("fails closed when audit changes between two health reads",async()=>{
  let n=0;
  const inspectHealth=async()=>({safeToResume:true,status:"ready",blockers:[],
   anchor:{count:0,tip:Z},audit:{count:n++,tip:Z}});
  const x=await createRecoveryOperationalVerification({inspectHealth}).assess();
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("OPERATIONAL_STATE_CHANGED");
 });
 it("preserves pending checkpoint evidence across 40 checks",async()=>fixture(async({fresh,directory})=>{
  const file=join(directory,"checkpoint.pending");await writeFile(file,"crash-evidence");
  for(let i=0;i<40;i++){
   const x=await fresh().assess();
   expect(x.safeToResume).toBe(false);
   expect(x.blockers).toContain("ANCHOR_PENDING_REVIEW_REQUIRED");
  }
  expect(await readFile(file,"utf8")).toBe("crash-evidence");
 }),90000);
 it("preserves checkpoint lock across 40 checks",async()=>fixture(async({fresh,directory})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  for(let i=0;i<40;i++){
   const x=await fresh().assess();
   expect(x.safeToResume).toBe(false);
   expect(x.blockers).toContain("ANCHOR_WRITER_LOCK_REVIEW_REQUIRED");
  }
 }),90000);
 it("detects signed rollback across 30 repeated checks",async()=>fixture(async({audit,anchor,fresh,auditDirectory})=>{
  for(let i=1;i<=5;i++)await audit.append({i});
  const file=join(auditDirectory,"audit.json"),old=await readFile(file,"utf8");
  for(let i=6;i<=15;i++)await audit.append({i});
  await anchor.advance();await writeFile(file,old);
  for(let i=0;i<30;i++){
   const x=await fresh().assess();
   expect(x.safeToResume).toBe(false);
   expect(x.blockers).toContain("AUDIT_ROLLBACK_REVIEW_REQUIRED");
  }
 }),90000);
 it("rejects known inspection errors without granting readiness",async()=>{
  let calls=0;
  const verifier=createRecoveryOperationalVerification({inspectHealth:async()=>{
   calls++;throw Object.assign(new Error("checkpoint unavailable"),{code:"XSUS_CHECKPOINT_CORRUPT"});
  }});
  const x=await verifier.assess();
  expect(calls).toBe(2);
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("OPERATIONAL_INSPECTION_ERROR");
 });
 it("preserves immutable operational report snapshots",async()=>fixture(async({fresh})=>{
  const x=await fresh().assess();
  expect(Object.isFrozen(x)).toBe(true);
  expect(Object.isFrozen(x.blockers)).toBe(true);
  expect(Object.isFrozen(x.anchor)).toBe(true);
  expect(Object.isFrozen(x.audit)).toBe(true);
 }));
});

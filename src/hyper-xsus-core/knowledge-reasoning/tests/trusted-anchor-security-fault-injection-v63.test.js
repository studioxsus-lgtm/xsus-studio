import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,mkdir,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createTrustedAnchorHealth} from "../trusted-anchor-health.js";
const ZERO="0".repeat(64);
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-security-v63-"));
 const auditDirectory=join(root,"audit"),directory=join(root,"anchor");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"v63-audit"});
 const config={directory,key:"b".repeat(48),keyId:"v63-anchor",auditDirectory,readDurableAudit:()=>audit.read(),authorize:async()=>true};
 const anchor=createTrustedRecoveryAuditAnchor(config);
 try{await audit.initialize();await anchor.initialize();await fn({root,auditDirectory,directory,audit,anchor,config});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v6.3 — security and fault injection",()=>{
 it("detects tampering with signed checkpoint count",async()=>fixture(async({anchor,directory})=>{
  const file=join(directory,"checkpoint.json"),raw=JSON.parse(await readFile(file,"utf8"));
  raw.count=1;raw.tip="a".repeat(64);
  await writeFile(file,JSON.stringify(raw));
  expect((await anchor.inspectHealth()).blockers).toContain("ANCHOR_INTEGRITY_REVIEW_REQUIRED");
 }));
 it("detects truncated checkpoint without reinitialization",async()=>fixture(async({anchor,directory})=>{
  const file=join(directory,"checkpoint.json");await writeFile(file,'{"count":');
  expect((await anchor.inspectHealth()).safeToResume).toBe(false);
  await expect(anchor.initialize()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_CORRUPT"});
 }));
 it("detects tampering with signed audit payload",async()=>fixture(async({anchor,audit,auditDirectory})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json"),raw=JSON.parse(await readFile(file,"utf8"));
  raw.entries[0].payload.id=999;
  await writeFile(file,JSON.stringify(raw));
  expect((await anchor.inspectHealth()).blockers).toContain("AUDIT_INTEGRITY_REVIEW_REQUIRED");
 }));
 it("detects truncated audit snapshot",async()=>fixture(async({anchor,auditDirectory})=>{
  await writeFile(join(auditDirectory,"audit.json"),"{");
  expect((await anchor.inspectHealth()).blockers).toContain("AUDIT_INTEGRITY_REVIEW_REQUIRED");
 }));
 it("blocks anchor advancement after an audit writer lock",async()=>fixture(async({anchor,audit,auditDirectory})=>{
  await audit.append({id:1});await mkdir(join(auditDirectory,"audit.lock"));
  expect((await anchor.inspectHealth()).blockers).toContain("AUDIT_WRITER_LOCK_REVIEW_REQUIRED");
  await expect(anchor.advance()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_BLOCKED"});
 }));
 it("blocks anchor advancement after pending audit write",async()=>fixture(async({anchor,audit,auditDirectory})=>{
  await audit.append({id:1});await writeFile(join(auditDirectory,"audit.pending"),"crash");
  expect((await anchor.inspectHealth()).blockers).toContain("AUDIT_PENDING_REVIEW_REQUIRED");
  await expect(anchor.advance()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_BLOCKED"});
 }));
 it("does not remove anchor pending evidence during health checks",async()=>fixture(async({anchor,directory})=>{
  const file=join(directory,"checkpoint.pending");await writeFile(file,"evidence");
  for(let i=0;i<20;i++)expect((await anchor.inspectHealth()).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("evidence");
 }));
 it("does not remove anchor writer lock during health checks",async()=>fixture(async({anchor,directory})=>{
  const file=join(directory,"checkpoint.lock");await mkdir(file);
  const before=await stat(file);
  for(let i=0;i<20;i++)expect((await anchor.inspectHealth()).safeToResume).toBe(false);
  expect((await stat(file)).ino).toBe(before.ino);
 }));
 it("rejects concurrent attempts to advance same signed audit tip",async()=>fixture(async({anchor,audit})=>{
  await audit.append({id:1});
  const outcomes=await Promise.allSettled(Array.from({length:20},()=>anchor.advance()));
  expect(outcomes.filter(x=>x.status==="fulfilled")).toHaveLength(1);
  expect((await anchor.read()).count).toBe(1);
 }));
 it("preserves signed checkpoint bytes across 20 denied approvals",async()=>fixture(async({audit,config,directory})=>{
  await audit.append({id:1});
  const file=join(directory,"checkpoint.json"),before=await readFile(file,"utf8");
  const denied=createTrustedRecoveryAuditAnchor({...config,authorize:async()=>false});
  for(let i=0;i<20;i++)
   await expect(denied.advance()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_DENIED"});
  expect(await readFile(file,"utf8")).toBe(before);
 }));
 it("detects a valid signed audit rollback",async()=>fixture(async({anchor,audit,auditDirectory})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json"),old=await readFile(file,"utf8");
  await audit.append({id:2});await anchor.advance();await writeFile(file,old);
  expect((await anchor.inspectHealth()).blockers).toContain("AUDIT_ROLLBACK_REVIEW_REQUIRED");
 }));
 it("detects changed anchor between two health reads",async()=>fixture(async({directory})=>{
  let reads=0;
  const health=createTrustedAnchorHealth({directory,
   readAnchor:async()=>({count:reads++,tip:ZERO}),
   inspectAudit:async()=>({safeToResume:true,blockers:[],audit:{count:1,tip:ZERO}})});
  expect((await health.assess()).blockers).toContain("ANCHOR_CHANGED_DURING_INSPECTION");
 }));
});

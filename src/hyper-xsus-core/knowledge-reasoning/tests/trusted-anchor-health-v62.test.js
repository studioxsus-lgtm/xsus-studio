import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createTrustedAnchorHealth} from "../trusted-anchor-health.js";
const Z="0".repeat(64);
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-anchor-health-v62-"));
 const directory=join(root,"anchor"),auditDirectory=join(root,"audit");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"v62-audit"});
 const anchor=createTrustedRecoveryAuditAnchor({directory,key:"b".repeat(48),keyId:"v62-anchor",auditDirectory,
  readDurableAudit:()=>audit.read(),authorize:async()=>true});
 try{await audit.initialize();await anchor.initialize();await fn({root,directory,auditDirectory,audit,anchor});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v6.2 trusted anchor health",()=>{
 it("reports clean authenticated zero state",async()=>fixture(async({anchor})=>{
  const x=await anchor.inspectHealth();
  expect(x.safeToResume).toBe(true);
  expect(x.status).toBe("ready");
  expect(x.anchor).toEqual({count:0,tip:Z});
  expect(Object.isFrozen(x.blockers)).toBe(true);
 }));
 it("reports clean advanced state",async()=>fixture(async({anchor,audit})=>{
  await audit.append({id:1});await anchor.advance();
  const x=await anchor.inspectHealth();
  expect(x.safeToResume).toBe(true);
  expect(x.anchor.count).toBe(1);
 }));
 it("blocks orphaned anchor writer lock without removing it",async()=>fixture(async({anchor,directory})=>{
  const lock=join(directory,"checkpoint.lock");await mkdir(lock);
  const x=await anchor.inspectHealth();
  expect(x.blockers).toContain("ANCHOR_WRITER_LOCK_REVIEW_REQUIRED");
  expect(x.safeToResume).toBe(false);
 }));
 it("blocks pending checkpoint residue without removing it",async()=>fixture(async({anchor,directory})=>{
  const file=join(directory,"checkpoint.pending");await writeFile(file,"review");
  expect((await anchor.inspectHealth()).blockers).toContain("ANCHOR_PENDING_REVIEW_REQUIRED");
  expect(await readFile(file,"utf8")).toBe("review");
 }));
 it("blocks corrupt authenticated anchor",async()=>fixture(async({anchor,directory})=>{
  const file=join(directory,"checkpoint.json");
  const body=JSON.parse(await readFile(file,"utf8"));body.count=3;
  await writeFile(file,JSON.stringify(body));
  const x=await anchor.inspectHealth();
  expect(x.blockers).toContain("ANCHOR_INTEGRITY_REVIEW_REQUIRED");
  expect(x.safeToResume).toBe(false);
 }));
 it("blocks signed audit rollback relative to anchor",async()=>fixture(async({anchor,audit,auditDirectory})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json"),old=await readFile(file,"utf8");
  await audit.append({id:2});await anchor.advance();
  await writeFile(file,old);
  const x=await anchor.inspectHealth();
  expect(x.blockers).toContain("AUDIT_ROLLBACK_REVIEW_REQUIRED");
  expect(x.safeToResume).toBe(false);
 }));
 it("blocks audit pending residue",async()=>fixture(async({anchor,auditDirectory})=>{
  await writeFile(join(auditDirectory,"audit.pending"),"partial");
  const x=await anchor.inspectHealth();
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("AUDIT_PENDING_REVIEW_REQUIRED");
 }));
 it("detects anchor changing between reads",async()=>fixture(async({directory})=>{
  let n=0;
  const health=createTrustedAnchorHealth({directory,
   readAnchor:async()=>({count:n++,tip:Z}),
   inspectAudit:async()=>({safeToResume:true,blockers:[],audit:{count:1,tip:Z}})});
  expect((await health.assess()).blockers).toContain("ANCHOR_CHANGED_DURING_INSPECTION");
 }));
 it("blocks uninitialized anchor without attempting repair",async()=>fixture(async({directory})=>{
  const health=createTrustedAnchorHealth({directory,
   readAnchor:async()=>{throw Object.assign(new Error("missing"),{code:"XSUS_CHECKPOINT_UNINITIALIZED"});},
   inspectAudit:async()=>{throw Error("must not inspect");}});
  expect((await health.assess()).blockers).toContain("ANCHOR_UNINITIALIZED");
 }));
 it("blocks malformed audit inspection reports",async()=>fixture(async({directory})=>{
  const health=createTrustedAnchorHealth({directory,
   readAnchor:async()=>({count:0,tip:Z}),
   inspectAudit:async()=>({safeToResume:true,blockers:[],audit:null})});
  expect((await health.assess()).blockers).toContain("AUDIT_NOT_READY");
 }));
});

import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createRecoverySecurityArchitecture} from "../recovery-security-architecture-v70.js";

const Z="0".repeat(64);
const ready=(count=0)=>({status:"ready",safeToResume:true,blockers:[],
 anchor:{count,tip:Z},audit:{count,tip:Z}});
const assess=inspectHealth=>createRecoverySecurityArchitecture({inspectHealth}).assess();

async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-hardening-v75-"));
 const directory=join(root,"anchor"),auditDirectory=join(root,"audit");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,
  key:"a".repeat(48),keyId:"v75-audit",maxEntries:200});
 const anchor=createTrustedRecoveryAuditAnchor({directory,
  key:"b".repeat(48),keyId:"v75-anchor",auditDirectory,
  readDurableAudit:()=>audit.read(),authorize:async()=>true});
 try{
  await audit.initialize();await anchor.initialize();
  await run({audit,anchor,directory,auditDirectory,inspect:()=>anchor.inspectHealth()});
 }finally{await rm(root,{recursive:true,force:true});}
}

describe("Hyper XSUS Core v7.5 — recovery security hardening",()=>{
 it("accepts 30 stable authenticated assessments",async()=>fixture(async({inspect})=>{
  for(let i=0;i<30;i++){
   const x=await assess(inspect);
   expect(x.safeToResume).toBe(true);
   expect(x.consistent).toBe(true);
  }
 }),90000);

 it("accepts 50 parallel read-only authenticated assessments",async()=>fixture(async({inspect})=>{
  const results=await Promise.all(Array.from({length:50},()=>assess(inspect)));
  expect(results.every(x=>x.safeToResume&&x.consistent)).toBe(true);
 }),90000);

 it("accepts 15 signed append, advance and verify cycles",async()=>fixture(async({audit,anchor,inspect})=>{
  for(let i=1;i<=15;i++){
   await audit.append({i});await anchor.advance();
   const x=await assess(inspect);
   expect(x.safeToResume).toBe(true);
   expect(x.anchor.count).toBe(i);
  }
 }),90000);

 it("fails closed on a cross-window checkpoint change",async()=>{
  let calls=0;
  const x=await assess(async()=>ready(calls++<2?0:1));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });

 it("fails closed on a security-window audit change",async()=>{
  let calls=0;
  const x=await assess(async()=>ready(calls++<3?0:1));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });

 it("rejects malformed checkpoint mark",async()=>{
  const x=await assess(async()=>({...ready(),anchor:{count:0,tip:"invalid"}}));
  expect(x.safeToResume).toBe(false);
  expect(x.anchor).toBe(null);
 });

 it("rejects a contradictory ready report with blockers",async()=>{
  const x=await assess(async()=>({...ready(),blockers:["MANUAL_REVIEW"]}));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("MANUAL_REVIEW");
 });

 it("preserves checkpoint pending evidence",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.pending");
  await writeFile(file,"manual-review");
  for(let i=0;i<15;i++)expect((await assess(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("manual-review");
 }),90000);

 it("preserves checkpoint lock evidence",async()=>fixture(async({directory,inspect})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  for(let i=0;i<15;i++)expect((await assess(inspect)).safeToResume).toBe(false);
 }),90000);

 it("preserves audit pending evidence",async()=>fixture(async({auditDirectory,inspect})=>{
  const file=join(auditDirectory,"audit.pending");
  await writeFile(file,"audit-review");
  for(let i=0;i<15;i++)expect((await assess(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("audit-review");
 }),90000);

 it("rejects signed audit rollback after trusted anchor advancement",async()=>fixture(async({audit,anchor,auditDirectory,inspect})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json");
  const previous=await readFile(file,"utf8");
  await audit.append({id:2});await anchor.advance();
  await writeFile(file,previous);
  expect((await assess(inspect)).safeToResume).toBe(false);
 }));

 it("rejects checkpoint tampering without altering evidence",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.json");
  const record=JSON.parse(await readFile(file,"utf8"));
  record.count=88;
  const tampered=JSON.stringify(record);
  await writeFile(file,tampered);
  expect((await assess(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe(tampered);
 }));

 it("blocks known integrity errors",async()=>{
  const x=await assess(async()=>{
   throw Object.assign(new Error("signature"),{code:"XSUS_CHECKPOINT_SIGNATURE"});
  });
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });

 it("propagates unexpected I/O errors",async()=>{
  await expect(assess(async()=>{
   throw Object.assign(new Error("disk"),{code:"EIO"});
  })).rejects.toMatchObject({code:"EIO"});
 });

 it("returns immutable safe and blocked reports",async()=>{
  for(const inspect of [async()=>ready(),async()=>({...ready(),status:"blocked"})]){
   const x=await assess(inspect);
   expect(Object.isFrozen(x)).toBe(true);
   expect(Object.isFrozen(x.blockers)).toBe(true);
   if(x.safeToResume){
    expect(Object.isFrozen(x.anchor)).toBe(true);
    expect(Object.isFrozen(x.audit)).toBe(true);
   }else{
    expect(x.anchor).toBe(null);
    expect(x.audit).toBe(null);
   }
  }
 });
});

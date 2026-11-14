import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createRecoverySecurityArchitecture} from "../recovery-security-architecture-v70.js";

const ZERO="0".repeat(64);
const ready=(count=0)=>({status:"ready",safeToResume:true,blockers:[],
 anchor:{count,tip:ZERO},audit:{count,tip:ZERO}});
const assess=inspectHealth=>createRecoverySecurityArchitecture({inspectHealth}).assess();

async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-integration-v74-"));
 const directory=join(root,"anchor"),auditDirectory=join(root,"audit");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,
  key:"a".repeat(48),keyId:"v74-audit",maxEntries:200});
 const anchor=createTrustedRecoveryAuditAnchor({directory,
  key:"b".repeat(48),keyId:"v74-anchor",auditDirectory,
  readDurableAudit:()=>audit.read(),authorize:async()=>true});
 try{
  await audit.initialize();await anchor.initialize();
  await run({audit,anchor,directory,auditDirectory,inspect:()=>anchor.inspectHealth()});
 }finally{await rm(root,{recursive:true,force:true});}
}

describe("Hyper XSUS Core v7.4 — integration and stress validation",()=>{
 it("verifies 40 authenticated assessments after five audit advances",async()=>fixture(async({audit,anchor,inspect})=>{
  for(let i=1;i<=5;i++){await audit.append({i});await anchor.advance();}
  for(let i=0;i<40;i++){
   const x=await assess(inspect);
   expect(x.safeToResume).toBe(true);
   expect(x.anchor.count).toBe(5);
  }
 }),90000);

 it("verifies 60 parallel read-only assessments of stable signed state",async()=>fixture(async({audit,anchor,inspect})=>{
  await audit.append({id:1});await anchor.advance();
  const results=await Promise.all(Array.from({length:60},()=>assess(inspect)));
  expect(results.every(x=>x.safeToResume&&x.consistent&&x.anchor.count===1)).toBe(true);
 }),90000);

 it("verifies 20 sequential signed append/anchor/check cycles",async()=>fixture(async({audit,anchor,inspect})=>{
  for(let i=1;i<=20;i++){
   await audit.append({i});await anchor.advance();
   const x=await assess(inspect);
   expect(x.safeToResume).toBe(true);
   expect(x.audit.count).toBe(i);
  }
 }),90000);

 it("rejects a change between the independent inspection windows",async()=>{
  let calls=0;
  const x=await assess(async()=>ready(calls++<2?0:1));
  expect(calls).toBe(4);
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });

 it("rejects a change within the operational window",async()=>{
  let calls=0;
  const x=await assess(async()=>ready(calls++));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("OPERATIONAL_STATE_CHANGED");
 });

 it("rejects a change within the security window",async()=>{
  let calls=0;
  const x=await assess(async()=>ready(calls++<3?0:1));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });

 it("preserves checkpoint pending evidence during 20 assessments",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.pending");
  await writeFile(file,"preserve-evidence");
  for(let i=0;i<20;i++)expect((await assess(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("preserve-evidence");
 }),90000);

 it("preserves checkpoint lock evidence during 20 assessments",async()=>fixture(async({directory,inspect})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  for(let i=0;i<20;i++)expect((await assess(inspect)).safeToResume).toBe(false);
 }),90000);

 it("preserves audit pending evidence during 20 assessments",async()=>fixture(async({auditDirectory,inspect})=>{
  const file=join(auditDirectory,"audit.pending");
  await writeFile(file,"audit-evidence");
  for(let i=0;i<20;i++)expect((await assess(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("audit-evidence");
 }),90000);

 it("rejects a signed audit rollback after anchor advancement",async()=>fixture(async({audit,anchor,auditDirectory,inspect})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json");
  const previous=await readFile(file,"utf8");
  await audit.append({id:2});await anchor.advance();
  await writeFile(file,previous);
  const x=await assess(inspect);
  expect(x.safeToResume).toBe(false);
  expect(x.anchor).toBe(null);
 }));

 it("rejects tampered checkpoint without changing it during inspection",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.json");
  const checkpoint=JSON.parse(await readFile(file,"utf8"));
  checkpoint.count=42;
  const tampered=JSON.stringify(checkpoint);
  await writeFile(file,tampered);
  expect((await assess(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe(tampered);
 }));

 it("fails closed for known integrity errors",async()=>{
  const x=await assess(async()=>{
   throw Object.assign(new Error("integrity"),{code:"XSUS_CHECKPOINT_SIGNATURE"});
  });
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });

 it("propagates unexpected storage errors",async()=>{
  await expect(assess(async()=>{
   throw Object.assign(new Error("disk"),{code:"EIO"});
  })).rejects.toMatchObject({code:"EIO"});
 });

 it("returns immutable results for stable and blocked inspections",async()=>{
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

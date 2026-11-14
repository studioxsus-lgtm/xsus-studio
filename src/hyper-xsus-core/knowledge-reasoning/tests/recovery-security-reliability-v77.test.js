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
 const root=await mkdtemp(join(tmpdir(),"xsus-reliability-v77-"));
 const directory=join(root,"anchor"),auditDirectory=join(root,"audit");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,
  key:"a".repeat(48),keyId:"v77-audit",maxEntries:200});
 const anchor=createTrustedRecoveryAuditAnchor({directory,
  key:"b".repeat(48),keyId:"v77-anchor",auditDirectory,
  readDurableAudit:()=>audit.read(),authorize:async()=>true});
 try{
  await audit.initialize();await anchor.initialize();
  await run({audit,anchor,directory,auditDirectory,inspect:()=>anchor.inspectHealth()});
 }finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v7.7 — recovery security reliability",()=>{
 it("performs 80 repeated authenticated checks",async()=>fixture(async({inspect})=>{
  for(let i=0;i<80;i++)expect((await assess(inspect)).safeToResume).toBe(true);
 }),90000);
 it("performs 80 parallel read-only checks",async()=>fixture(async({inspect})=>{
  const results=await Promise.all(Array.from({length:80},()=>assess(inspect)));
  expect(results).toHaveLength(80);
  expect(results.every(x=>x.safeToResume&&x.consistent)).toBe(true);
 }),90000);
 it("verifies 25 signed append and anchor cycles",async()=>fixture(async({audit,anchor,inspect})=>{
  for(let i=1;i<=25;i++){
   await audit.append({i});await anchor.advance();
   const x=await assess(inspect);
   expect(x.safeToResume).toBe(true);
   expect(x.anchor.count).toBe(i);
  }
 }),90000);
 it("detects a change between independent verification windows",async()=>{
  let calls=0;
  const x=await assess(async()=>ready(calls++<2?0:1));
  expect(calls).toBe(4);
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });
 it("detects a change within operational observations",async()=>{
  let calls=0;
  const x=await assess(async()=>ready(calls++));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("OPERATIONAL_STATE_CHANGED");
 });
 it("detects a change within security observations",async()=>{
  let calls=0;
  const x=await assess(async()=>ready(calls++<3?0:1));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });
 it("does not allow a later clean observation to erase an earlier blocker",async()=>{
  let calls=0;
  const x=await assess(async()=>{
   const r=ready();
   if(++calls===1)r.blockers.push("MANUAL_REVIEW");
   return r;
  });
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("MANUAL_REVIEW");
 });
 it("rejects a known integrity error on the final observation",async()=>{
  let calls=0;
  const x=await assess(async()=>{
   if(++calls===4)throw Object.assign(new Error("signature"),{code:"XSUS_CHECKPOINT_SIGNATURE"});
   return ready();
  });
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("SECURITY_INSPECTION_ERROR");
 });
 it("propagates unexpected I/O error on final observation",async()=>{
  let calls=0;
  await expect(assess(async()=>{
   if(++calls===4)throw Object.assign(new Error("disk"),{code:"EIO"});
   return ready();
  })).rejects.toMatchObject({code:"EIO"});
 });
 it("preserves checkpoint pending evidence over 25 blocked assessments",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.pending");
  await writeFile(file,"incident");
  for(let i=0;i<25;i++)expect((await assess(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("incident");
 }),90000);
 it("preserves checkpoint writer lock over 25 blocked assessments",async()=>fixture(async({directory,inspect})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  for(let i=0;i<25;i++)expect((await assess(inspect)).safeToResume).toBe(false);
 }),90000);
 it("preserves audit pending evidence over 25 blocked assessments",async()=>fixture(async({auditDirectory,inspect})=>{
  const file=join(auditDirectory,"audit.pending");
  await writeFile(file,"incident");
  for(let i=0;i<25;i++)expect((await assess(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("incident");
 }),90000);
 it("detects signed audit rollback behind an advanced anchor",async()=>fixture(async({audit,anchor,auditDirectory,inspect})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json");
  const previous=await readFile(file,"utf8");
  await audit.append({id:2});await anchor.advance();
  await writeFile(file,previous);
  const x=await assess(inspect);
  expect(x.safeToResume).toBe(false);
  expect(x.anchor).toBe(null);
 }));
 it("detects signed checkpoint tampering",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.json");
  const data=JSON.parse(await readFile(file,"utf8"));
  data.count=50;
  await writeFile(file,JSON.stringify(data));
  expect((await assess(inspect)).safeToResume).toBe(false);
 }));
 it("returns immutable reports and never exposes trusted marks on failure",async()=>{
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

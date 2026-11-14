import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createRecoverySecurityArchitecture} from "../recovery-security-architecture-v70.js";

const ZERO="0".repeat(64);
const health=(count=0,tip=ZERO)=>({status:"ready",safeToResume:true,blockers:[],
 anchor:{count,tip},audit:{count,tip}});
const assess=inspectHealth=>createRecoverySecurityArchitecture({inspectHealth}).assess();

async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-assurance-v76-"));
 const directory=join(root,"anchor"),auditDirectory=join(root,"audit");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),
  keyId:"v76-audit",maxEntries:200});
 const anchor=createTrustedRecoveryAuditAnchor({directory,key:"b".repeat(48),
  keyId:"v76-anchor",auditDirectory,readDurableAudit:()=>audit.read(),
  authorize:async()=>true});
 try{
  await audit.initialize();await anchor.initialize();
  await run({audit,anchor,directory,auditDirectory,inspect:()=>anchor.inspectHealth()});
 }finally{await rm(root,{recursive:true,force:true});}
}

describe("Hyper XSUS Core v7.6 — security consistency and recovery assurance",()=>{
 it("performs 50 authenticated stable assessments",async()=>fixture(async({inspect})=>{
  for(let i=0;i<50;i++)expect((await assess(inspect)).safeToResume).toBe(true);
 }),90000);

 it("performs 70 concurrent authenticated read-only assessments",async()=>fixture(async({inspect})=>{
  const reports=await Promise.all(Array.from({length:70},()=>assess(inspect)));
  expect(reports).toHaveLength(70);
  expect(reports.every(x=>x.safeToResume&&x.consistent)).toBe(true);
 }),90000);

 it("verifies 20 signed audit and anchor advances",async()=>fixture(async({audit,anchor,inspect})=>{
  for(let i=1;i<=20;i++){
   await audit.append({i});await anchor.advance();
   const x=await assess(inspect);
   expect(x.safeToResume).toBe(true);
   expect(x.anchor.count).toBe(i);
  }
 }),90000);

 it("rejects a changed anchor between verification windows",async()=>{
  let n=0;
  const x=await assess(async()=>health(n++<2?0:1));
  expect(n).toBe(4);
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });

 it("rejects a changed audit tip within the security window",async()=>{
  let n=0;
  const x=await assess(async()=>health(0,++n===4?"f".repeat(64):ZERO));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });

 it("rejects inconsistent anchor and audit counts",async()=>{
  const x=await assess(async()=>({...health(2),audit:{count:1,tip:ZERO}}));
  expect(x.safeToResume).toBe(false);
  expect(x.anchor).toBe(null);
 });

 it("rejects malformed audit hash",async()=>{
  const x=await assess(async()=>({...health(),audit:{count:0,tip:"bad"}}));
  expect(x.safeToResume).toBe(false);
  expect(x.audit).toBe(null);
 });

 it("rejects readiness with an explicit blocker",async()=>{
  const x=await assess(async()=>({...health(),blockers:["MANUAL_REVIEW"]}));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("MANUAL_REVIEW");
 });

 it("preserves checkpoint pending evidence over 20 blocked inspections",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.pending");
  await writeFile(file,"review");
  for(let i=0;i<20;i++)expect((await assess(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("review");
 }),90000);

 it("preserves checkpoint lock evidence over 20 blocked inspections",async()=>fixture(async({directory,inspect})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  for(let i=0;i<20;i++)expect((await assess(inspect)).safeToResume).toBe(false);
 }),90000);

 it("preserves audit pending evidence over 20 blocked inspections",async()=>fixture(async({auditDirectory,inspect})=>{
  const file=join(auditDirectory,"audit.pending");
  await writeFile(file,"review");
  for(let i=0;i<20;i++)expect((await assess(inspect)).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("review");
 }),90000);

 it("rejects signed audit rollback after anchor advancement",async()=>fixture(async({audit,anchor,auditDirectory,inspect})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json");
  const earlier=await readFile(file,"utf8");
  await audit.append({id:2});await anchor.advance();
  await writeFile(file,earlier);
  expect((await assess(inspect)).safeToResume).toBe(false);
 }));

 it("rejects tampered signed checkpoint",async()=>fixture(async({directory,inspect})=>{
  const file=join(directory,"checkpoint.json");
  const record=JSON.parse(await readFile(file,"utf8"));
  record.count=99;
  await writeFile(file,JSON.stringify(record));
  expect((await assess(inspect)).safeToResume).toBe(false);
 }));

 it("fails closed on a known integrity exception",async()=>{
  const x=await assess(async()=>{
   throw Object.assign(new Error("signature"),{code:"XSUS_CHECKPOINT_SIGNATURE"});
  });
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });

 it("propagates unexpected storage faults",async()=>{
  await expect(assess(async()=>{
   throw Object.assign(new Error("disk"),{code:"EIO"});
  })).rejects.toMatchObject({code:"EIO"});
 });

 it("returns frozen reports and never exposes trusted marks when blocked",async()=>{
  for(const inspector of [async()=>health(),async()=>({...health(),status:"blocked"})]){
   const x=await assess(inspector);
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

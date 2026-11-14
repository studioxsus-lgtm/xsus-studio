import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createRecoverySecurityArchitecture} from "../recovery-security-architecture-v70.js";
const Z="0".repeat(64);
const ready=(count=0,tip=Z)=>({status:"ready",safeToResume:true,blockers:[],
 anchor:{count,tip},audit:{count,tip}});
const assess=inspectHealth=>createRecoverySecurityArchitecture({inspectHealth}).assess();
async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-architecture-v70-"));
 const auditDirectory=join(root,"audit"),directory=join(root,"anchor");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"v70-audit"});
 const anchor=createTrustedRecoveryAuditAnchor({directory,key:"b".repeat(48),keyId:"v70-anchor",
  auditDirectory,readDurableAudit:()=>audit.read(),authorize:async()=>true});
 try{await audit.initialize();await anchor.initialize();await run({audit,anchor,directory,auditDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v7.0 — coordinated recovery security architecture",()=>{
 it("accepts four matching authenticated health observations",async()=>fixture(async({anchor})=>{
  const x=await assess(()=>anchor.inspectHealth());
  expect(x.safeToResume).toBe(true);expect(x.consistent).toBe(true);
  expect(x.anchor.count).toBe(0);
 }));
 it("accepts an explicitly advanced authenticated anchor",async()=>fixture(async({audit,anchor})=>{
  await audit.append({id:1});await anchor.advance();
  const x=await assess(()=>anchor.inspectHealth());
  expect(x.safeToResume).toBe(true);expect(x.anchor.count).toBe(1);
 }));
 it("blocks a change between independent verification windows",async()=>{
  let n=0;const x=await assess(async()=>ready(n++<2?0:1));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });
 it("blocks a change within operational verification",async()=>{
  let n=0;const x=await assess(async()=>ready(n++));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("OPERATIONAL_STATE_CHANGED");
 });
 it("blocks a change within security validation",async()=>{
  let n=0;const x=await assess(async()=>ready(n++<3?0:1));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });
 it("rejects malformed health reports",async()=>{
  const x=await assess(async()=>({...ready(),anchor:{count:0,tip:"bad"}}));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });
 it("rejects ready status with explicit blockers",async()=>{
  const x=await assess(async()=>({...ready(),blockers:["MANUAL_REVIEW"]}));
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("MANUAL_REVIEW");
 });
 it("blocks known integrity errors without granting readiness",async()=>{
  const x=await assess(async()=>{throw Object.assign(new Error("invalid"),{code:"XSUS_CHECKPOINT_SIGNATURE"});});
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
 });
 it("propagates unexpected disk errors",async()=>{
  await expect(assess(async()=>{throw Object.assign(new Error("disk"),{code:"EIO"});})).rejects.toMatchObject({code:"EIO"});
 });
 it("preserves checkpoint pending evidence",async()=>fixture(async({anchor,directory})=>{
  const file=join(directory,"checkpoint.pending");await writeFile(file,"review");
  expect((await assess(()=>anchor.inspectHealth())).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("review");
 }));
 it("detects authenticated audit rollback",async()=>fixture(async({audit,anchor,auditDirectory})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json"),previous=await readFile(file,"utf8");
  await audit.append({id:2});await anchor.advance();await writeFile(file,previous);
  expect((await assess(()=>anchor.inspectHealth())).safeToResume).toBe(false);
 }));
 it("freezes reports, blockers and marks",async()=>{
  const x=await assess(async()=>ready());
  expect(Object.isFrozen(x)).toBe(true);
  expect(Object.isFrozen(x.blockers)).toBe(true);
  expect(Object.isFrozen(x.anchor)).toBe(true);
  expect(Object.isFrozen(x.audit)).toBe(true);
 });
 it("requires an inspector",()=>{
  expect(()=>createRecoverySecurityArchitecture()).toThrow(TypeError);
 });
});
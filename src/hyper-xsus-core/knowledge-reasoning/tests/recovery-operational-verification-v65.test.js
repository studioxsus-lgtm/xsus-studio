import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createRecoveryOperationalVerification} from "../recovery-operational-verification-v65.js";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
const Z="0".repeat(64);
const report=(anchor={count:0,tip:Z},audit={count:0,tip:Z})=>({safeToResume:true,status:"ready",blockers:[],anchor,audit});
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-operation-v65-"));
 const auditDirectory=join(root,"audit"),directory=join(root,"anchor");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"v65-audit"});
 const anchor=createTrustedRecoveryAuditAnchor({directory,key:"b".repeat(48),keyId:"v65-anchor",
  auditDirectory,readDurableAudit:()=>audit.read(),authorize:async()=>true});
 try{await audit.initialize();await anchor.initialize();await fn({audit,anchor,directory,auditDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v6.5 operational recovery verification",()=>{
 it("accepts two stable authenticated observations",async()=>fixture(async({anchor})=>{
  const verifier=createRecoveryOperationalVerification({inspectHealth:()=>anchor.inspectHealth()});
  const x=await verifier.assess();
  expect(x.safeToResume).toBe(true);expect(x.stable).toBe(true);
  expect(x.anchor).toEqual({count:0,tip:Z});
  expect(Object.isFrozen(x.blockers)).toBe(true);
 }));
 it("accepts stable advanced audit and anchor",async()=>fixture(async({audit,anchor})=>{
  await audit.append({id:1});await anchor.advance();
  expect((await createRecoveryOperationalVerification({inspectHealth:()=>anchor.inspectHealth()}).assess()).safeToResume).toBe(true);
 }));
 it("rejects anchor changes between observations",async()=>{
  let n=0;const verifier=createRecoveryOperationalVerification({inspectHealth:async()=>report({count:n++,tip:Z})});
  const x=await verifier.assess();
  expect(x.blockers).toContain("OPERATIONAL_STATE_CHANGED");
  expect(x.safeToResume).toBe(false);
 });
 it("rejects audit changes between observations",async()=>{
  let n=0;const verifier=createRecoveryOperationalVerification({inspectHealth:async()=>report(undefined,{count:n++,tip:Z})});
  expect((await verifier.assess()).blockers).toContain("OPERATIONAL_STATE_CHANGED");
 });
 it("rejects pending checkpoint evidence",async()=>fixture(async({anchor,directory})=>{
  await writeFile(join(directory,"checkpoint.pending"),"evidence");
  const x=await createRecoveryOperationalVerification({inspectHealth:()=>anchor.inspectHealth()}).assess();
  expect(x.blockers).toContain("ANCHOR_PENDING_REVIEW_REQUIRED");
  expect(x.safeToResume).toBe(false);
 }));
 it("rejects orphaned checkpoint lock",async()=>fixture(async({anchor,directory})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  expect((await createRecoveryOperationalVerification({inspectHealth:()=>anchor.inspectHealth()}).assess()).blockers)
   .toContain("ANCHOR_WRITER_LOCK_REVIEW_REQUIRED");
 }));
 it("rejects pending audit evidence",async()=>fixture(async({anchor,auditDirectory})=>{
  await writeFile(join(auditDirectory,"audit.pending"),"evidence");
  expect((await createRecoveryOperationalVerification({inspectHealth:()=>anchor.inspectHealth()}).assess()).blockers)
   .toContain("AUDIT_PENDING_REVIEW_REQUIRED");
 }));
 it("rejects malformed health report",async()=>{
  const verifier=createRecoveryOperationalVerification({inspectHealth:async()=>({safeToResume:true,status:"ready",blockers:[],anchor:null,audit:null})});
  expect((await verifier.assess()).blockers).toContain("OPERATIONAL_HEALTH_NOT_READY");
 });
 it("rejects audit count behind anchor count",async()=>{
  const verifier=createRecoveryOperationalVerification({inspectHealth:async()=>report({count:2,tip:Z},{count:1,tip:Z})});
  expect((await verifier.assess()).safeToResume).toBe(false);
 });
 it("handles known security errors as blockers without authorization",async()=>{
  const verifier=createRecoveryOperationalVerification({inspectHealth:async()=>{throw Object.assign(new Error("corrupt"),{code:"XSUS_CHECKPOINT_CORRUPT"});}});
  const x=await verifier.assess();
  expect(x.blockers).toContain("OPERATIONAL_INSPECTION_ERROR");
  expect(x.safeToResume).toBe(false);
 });
 it("propagates unexpected infrastructure errors",async()=>{
  const verifier=createRecoveryOperationalVerification({inspectHealth:async()=>{throw Object.assign(new Error("disk unavailable"),{code:"EIO"});}});
  await expect(verifier.assess()).rejects.toMatchObject({code:"EIO"});
 });
 it("requires an inspector",()=>{
  expect(()=>createRecoveryOperationalVerification()).toThrow(TypeError);
 });
});

import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createRecoverySecurityValidation} from "../recovery-security-validation-v68.js";
const Z="0".repeat(64);
const ready=(anchor={count:0,tip:Z},audit={count:0,tip:Z})=>({safeToResume:true,status:"ready",blockers:[],anchor,audit});
const verify=inspectHealth=>createRecoverySecurityValidation({inspectHealth}).assess();
async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-security-v68-"));
 const auditDirectory=join(root,"audit"),directory=join(root,"anchor");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"v68-audit"});
 const anchor=createTrustedRecoveryAuditAnchor({directory,key:"b".repeat(48),keyId:"v68-anchor",
  auditDirectory,readDurableAudit:()=>audit.read(),authorize:async()=>true});
 try{await audit.initialize();await anchor.initialize();await run({audit,anchor,directory,auditDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v6.8 — strict recovery security validation",()=>{
 it("accepts two stable authenticated health observations",async()=>fixture(async({anchor})=>{
  const x=await verify(()=>anchor.inspectHealth());
  expect(x.safeToResume).toBe(true);expect(x.stable).toBe(true);
  expect(x.anchor).toEqual({count:0,tip:Z});
 }));
 it("accepts an authenticated advanced anchor",async()=>fixture(async({audit,anchor})=>{
  await audit.append({id:1});await anchor.advance();
  expect((await verify(()=>anchor.inspectHealth())).anchor.count).toBe(1);
 }));
 it("rejects malformed anchor hash",async()=>{
  expect((await verify(async()=>ready({count:0,tip:"bad"}))).blockers).toContain("SECURITY_HEALTH_INVALID");
 });
 it("rejects negative audit counts",async()=>{
  expect((await verify(async()=>ready(undefined,{count:-1,tip:Z}))).safeToResume).toBe(false);
 });
 it("rejects audit behind trusted anchor",async()=>{
  expect((await verify(async()=>ready({count:2,tip:Z},{count:1,tip:Z}))).safeToResume).toBe(false);
 });
 it("rejects forged ready status with blockers",async()=>{
  expect((await verify(async()=>({...ready(),blockers:["REVIEW_REQUIRED"]})).safeToResume).toBe(false);
 });
 it("detects changed audit mark across observations",async()=>{
  let n=0;const x=await verify(async()=>ready(undefined,{count:n++,tip:Z}));
  expect(x.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });
 it("detects changed anchor mark across observations",async()=>{
  let n=0;const x=await verify(async()=>ready({count:n++,tip:Z},{count:3,tip:Z}));
  expect(x.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });
 it("copies caller-owned marks before the next observation",async()=>{
  const first=ready(),second=ready();
  let n=0;const x=await verify(async()=>{
   if(n++===0)return first;
   first.anchor.count=99;first.audit.count=99;
   return second;
  });
  expect(x.safeToResume).toBe(true);
  expect(x.anchor.count).toBe(0);
 }));
 it("blocks known integrity exceptions",async()=>{
  const x=await verify(async()=>{throw Object.assign(new Error("invalid"),{code:"XSUS_CHECKPOINT_SIGNATURE"});});
  expect(x.safeToResume).toBe(false);
  expect(x.blockers).toContain("SECURITY_INSPECTION_ERROR");
 }));
 it("propagates unknown I/O failures",async()=>{
  await expect(verify(async()=>{throw Object.assign(new Error("disk"),{code:"EIO"});})).rejects.toMatchObject({code:"EIO"});
 });
 it("preserves pending checkpoint evidence",async()=>fixture(async({anchor,directory})=>{
  const file=join(directory,"checkpoint.pending");await writeFile(file,"operator-review");
  expect((await verify(()=>anchor.inspectHealth())).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("operator-review");
 }));
 it("rejects signed audit rollback",async()=>fixture(async({audit,anchor,auditDirectory})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json"),old=await readFile(file,"utf8");
  await audit.append({id:2});await anchor.advance();await writeFile(file,old);
  expect((await verify(()=>anchor.inspectHealth())).safeToResume).toBe(false);
 }));
 it("returns frozen result and frozen marks",async()=>{
  const x=await verify(async()=>ready());
  expect(Object.isFrozen(x)).toBe(true);
  expect(Object.isFrozen(x.blockers)).toBe(true);
  expect(Object.isFrozen(x.anchor)).toBe(true);
  expect(Object.isFrozen(x.audit)).toBe(true);
 });
 it("requires a health inspector",()=>{
  expect(()=>createRecoverySecurityValidation()).toThrow(TypeError);
 });
});

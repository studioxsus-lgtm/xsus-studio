import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createRecoveryAuditIntegrity} from "../recovery-audit-integrity.js";
const ZERO="0".repeat(64);
async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-audit-integrity-v58-"));
 const directory=join(root,"audit");
 const audit=createDurableRecoveryAudit({directory,key:"a".repeat(48),keyId:"v58"});
 const integrity=createRecoveryAuditIntegrity({directory,readDurableAudit:()=>audit.read()});
 try{await run({root,directory,audit,integrity});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v5.8 audit recovery integrity",()=>{
 it("reports missing audit as blocked",async()=>fixture(async({integrity})=>{
  expect(await integrity.assess()).toMatchObject({safeToResume:false,blockers:["AUDIT_UNINITIALIZED"]});
 }));
 it("accepts initialized authenticated audit",async()=>fixture(async({audit,integrity})=>{
  await audit.initialize();
  expect(await integrity.assess()).toMatchObject({status:"ready",safeToResume:true,anchored:false,audit:{count:0,tip:ZERO}});
 }));
 it("accepts matching external anchor",async()=>fixture(async({audit,integrity})=>{
  await audit.initialize();await audit.append({kind:"one"});
  const {count,tip}=await audit.read();
  expect(await integrity.assess({trustedAnchor:{count,tip}})).toMatchObject({safeToResume:true,anchored:true});
 }));
 it("detects rollback against higher trusted count",async()=>fixture(async({audit,integrity})=>{
  await audit.initialize();await audit.append({kind:"one"});
  const result=await integrity.assess({trustedAnchor:{count:2,tip:"b".repeat(64)}});
  expect(result.blockers).toContain("AUDIT_ROLLBACK_REVIEW_REQUIRED");
 }));
 it("detects same-count mismatched anchor",async()=>fixture(async({audit,integrity})=>{
  await audit.initialize();await audit.append({kind:"one"});
  expect((await integrity.assess({trustedAnchor:{count:1,tip:"b".repeat(64)}})).blockers).toContain("AUDIT_ANCHOR_MISMATCH");
 }));
 it("detects mismatched trusted prefix in longer audit",async()=>fixture(async({audit,integrity})=>{
  await audit.initialize();await audit.append({kind:"one"});await audit.append({kind:"two"});
  expect((await integrity.assess({trustedAnchor:{count:1,tip:"b".repeat(64)}})).blockers).toContain("AUDIT_PREFIX_MISMATCH");
 }));
 it("accepts correct trusted prefix with subsequent entries",async()=>fixture(async({audit,integrity})=>{
  await audit.initialize();const first=await audit.append({kind:"one"});await audit.append({kind:"two"});
  expect((await integrity.assess({trustedAnchor:{count:1,tip:first.hash}})).safeToResume).toBe(true);
 }));
 it("blocks pending crash residue without modifying it",async()=>fixture(async({audit,directory,integrity})=>{
  await audit.initialize();const pending=join(directory,"audit.pending");
  await writeFile(pending,"crash");
  expect((await integrity.assess()).blockers).toContain("AUDIT_PENDING_REVIEW_REQUIRED");
  expect(await readFile(pending,"utf8")).toBe("crash");
 }));
 it("blocks writer lock without removing it",async()=>fixture(async({audit,directory,integrity})=>{
  await audit.initialize();await mkdir(join(directory,"audit.lock"));
  expect((await integrity.assess()).blockers).toContain("AUDIT_WRITER_LOCK_REVIEW_REQUIRED");
 }));
 it("blocks signed audit tampering",async()=>fixture(async({audit,directory,integrity})=>{
  await audit.initialize();await audit.append({kind:"one"});
  const file=join(directory,"audit.json"),obj=JSON.parse(await readFile(file,"utf8"));
  obj.entries[0].payload.kind="tampered";await writeFile(file,JSON.stringify(obj));
  expect((await integrity.assess()).blockers).toContain("AUDIT_INTEGRITY_REVIEW_REQUIRED");
 }));
 it("rejects malformed trusted anchor",async()=>fixture(async({integrity})=>{
  await expect(integrity.assess({trustedAnchor:{count:-1,tip:ZERO}})).rejects.toMatchObject({code:"XSUS_AUDIT_INTEGRITY_ANCHOR_INVALID"});
 }));
 it("does not swallow unrelated I/O errors",async()=>{
  const integrity=createRecoveryAuditIntegrity({directory:"/tmp",readDurableAudit:async()=>{throw Error("disk error");}});
  await expect(integrity.assess()).rejects.toThrow("disk error");
 });
});

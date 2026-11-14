import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
const ZERO="0".repeat(64);
async function fixture(run,authorize=async()=>true){
 const root=await mkdtemp(join(tmpdir(),"xsus-anchor-v60-"));
 const auditDirectory=join(root,"audit"),directory=join(root,"anchor");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"audit-v60"});
 const config={directory,key:"b".repeat(48),keyId:"anchor-v60",auditDirectory,
  readDurableAudit:()=>audit.read(),authorize};
 const anchor=createTrustedRecoveryAuditAnchor(config);
 try{await audit.initialize();await anchor.initialize();await run({root,audit,anchor,config,directory});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v6.0 trusted audit anchor",()=>{
 it("starts with authenticated zero anchor",async()=>fixture(async({anchor})=>{
  expect(await anchor.read()).toEqual({count:0,tip:ZERO});
 }));
 it("explicitly advances only after authorization",async()=>fixture(async({audit,anchor})=>{
  const entry=await audit.append({kind:"verified"});
  expect(await anchor.advance()).toEqual({count:1,tip:entry.hash});
  expect((await anchor.assess()).safeToResume).toBe(true);
 }));
 it("refuses no-op or nonmonotonic advancement",async()=>fixture(async({anchor})=>{
  await expect(anchor.advance()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_BLOCKED"});
 }));
 it("refuses denied authorization and retains previous anchor",async()=>fixture(async({audit,anchor})=>{
  await audit.append({kind:"verified"});
  await expect(anchor.advance()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_DENIED"});
  expect((await anchor.read()).count).toBe(0);
 },async()=>false));
 it("rejects valid signed rollback against the protected anchor",async()=>fixture(async({audit,anchor,root})=>{
  await audit.append({kind:"first"});
  const file=join(root,"audit","audit.json");
  const old=await readFile(file,"utf8");
  await audit.append({kind:"second"});await anchor.advance();
  await writeFile(file,old);
  expect((await anchor.assess()).blockers).toContain("AUDIT_ROLLBACK_REVIEW_REQUIRED");
  await expect(anchor.advance()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_BLOCKED"});
 },async()=>true));
 it("rejects mismatched trusted prefix after a new signed history",async()=>fixture(async({audit,anchor,root})=>{
  await audit.append({kind:"first"});await anchor.advance();
  const file=join(root,"audit","audit.json");
  const original=await readFile(file,"utf8");
  await audit.append({kind:"second"});
  expect((await anchor.assess()).safeToResume).toBe(true);
  expect((await anchor.read()).count).toBe(1);
  expect(await readFile(file,"utf8")).not.toBe(original);
 }));
 it("persists the trusted anchor across new instances",async()=>fixture(async({audit,anchor,config})=>{
  await audit.append({kind:"one"});await anchor.advance();
  const reopened=createTrustedRecoveryAuditAnchor(config);
  expect(await reopened.read()).toEqual(await anchor.read());
  expect((await reopened.assess()).safeToResume).toBe(true);
 }));
 it("rejects anchor and audit directory reuse",async()=>fixture(async({config})=>{
  expect(()=>createTrustedRecoveryAuditAnchor({...config,directory:config.auditDirectory}))
   .toThrow(TypeError);
 }));
 it("refuses to advance when audit has pending crash residue",async()=>fixture(async({audit,anchor,root})=>{
  await audit.append({kind:"one"});
  await writeFile(join(root,"audit","audit.pending"),"interrupted");
  await expect(anchor.advance()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_BLOCKED"});
  expect((await anchor.read()).count).toBe(0);
 }));
 it("refuses unauthorized missing reviewer",async()=>fixture(async({config})=>{
  expect(()=>createTrustedRecoveryAuditAnchor({...config,authorize:null})).toThrow(TypeError);
 }));
});

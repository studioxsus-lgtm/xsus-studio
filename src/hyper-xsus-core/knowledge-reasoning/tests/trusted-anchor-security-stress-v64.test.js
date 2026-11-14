import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,mkdir,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
const ZERO="0".repeat(64);
async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-stress-v64-"));
 const auditDirectory=join(root,"audit"),directory=join(root,"anchor");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"v64-audit",maxEntries:200});
 const config={directory,key:"b".repeat(48),keyId:"v64-anchor",auditDirectory,
  readDurableAudit:()=>audit.read(),authorize:async()=>true};
 const anchor=createTrustedRecoveryAuditAnchor(config);
 const fresh=()=>createTrustedRecoveryAuditAnchor(config);
 try{await audit.initialize();await anchor.initialize();await run({root,auditDirectory,directory,audit,anchor,fresh,config});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v6.4 — security reliability and stress",()=>{
 it("keeps 60 sequential authenticated append and anchor cycles monotonic",async()=>fixture(async({audit,fresh})=>{
  let last=ZERO;
  for(let i=1;i<=60;i++){
   const entry=await audit.append({iteration:i});
   expect(entry.previousHash).toBe(last);
   last=entry.hash;
   expect(await fresh().advance()).toEqual({count:i,tip:last});
  }
  const state=await fresh().inspectHealth();
  expect(state.safeToResume).toBe(true);
  expect(state.anchor).toEqual({count:60,tip:last});
 }),90000);
 it("survives 100 parallel read-only health assessments",async()=>fixture(async({audit,anchor,fresh})=>{
  for(let i=0;i<8;i++)await audit.append({i});
  await anchor.advance();
  const results=await Promise.all(Array.from({length:100},()=>fresh().inspectHealth()));
  expect(results.every(x=>x.safeToResume&&x.anchor.count===8&&x.audit.count===8)).toBe(true);
 }),60000);
 it("allows only one winner among 40 concurrent anchor advancements",async()=>fixture(async({audit,fresh})=>{
  await audit.append({id:1});
  const results=await Promise.allSettled(Array.from({length:40},()=>fresh().advance()));
  expect(results.filter(x=>x.status==="fulfilled")).toHaveLength(1);
  expect((await fresh().read()).count).toBe(1);
  expect((await fresh().inspectHealth()).safeToResume).toBe(true);
 }),60000);
 it("keeps anchor unchanged after 40 rejected reviewer decisions",async()=>fixture(async({audit,directory,config})=>{
  await audit.append({id:1});
  const file=join(directory,"checkpoint.json"),before=await readFile(file,"utf8");
  const denied=createTrustedRecoveryAuditAnchor({...config,authorize:async()=>false});
  for(let i=0;i<40;i++)
   await expect(denied.advance()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_DENIED"});
  expect(await readFile(file,"utf8")).toBe(before);
 }),60000);
 it("preserves pending crash evidence through 40 health inspections",async()=>fixture(async({audit,anchor,directory})=>{
  await audit.append({id:1});
  const file=join(directory,"checkpoint.pending");await writeFile(file,"operator-review");
  const results=await Promise.all(Array.from({length:40},()=>anchor.inspectHealth()));
  expect(results.every(x=>!x.safeToResume&&x.blockers.includes("ANCHOR_PENDING_REVIEW_REQUIRED"))).toBe(true);
  expect(await readFile(file,"utf8")).toBe("operator-review");
  await expect(anchor.advance()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_PENDING"});
 }),60000);
 it("preserves writer lock through 40 health inspections",async()=>fixture(async({anchor,directory})=>{
  const file=join(directory,"checkpoint.lock");await mkdir(file);
  const before=await stat(file);
  const results=await Promise.all(Array.from({length:40},()=>anchor.inspectHealth()));
  expect(results.every(x=>x.blockers.includes("ANCHOR_WRITER_LOCK_REVIEW_REQUIRED"))).toBe(true);
  expect((await stat(file)).ino).toBe(before.ino);
 }),60000);
 it("detects signed rollback after 20 authenticated writes",async()=>fixture(async({audit,anchor,auditDirectory})=>{
  for(let i=1;i<=5;i++)await audit.append({i});
  const file=join(auditDirectory,"audit.json"),older=await readFile(file,"utf8");
  for(let i=6;i<=20;i++)await audit.append({i});
  await anchor.advance();await writeFile(file,older);
  for(let i=0;i<20;i++){
   const report=await anchor.inspectHealth();
   expect(report.safeToResume).toBe(false);
   expect(report.blockers).toContain("AUDIT_ROLLBACK_REVIEW_REQUIRED");
  }
  expect((await anchor.read()).count).toBe(20);
 }),60000);
 it("reopens 40 independent instances without changing committed bytes",async()=>fixture(async({audit,anchor,directory,fresh})=>{
  for(let i=1;i<=12;i++)await audit.append({i});
  await anchor.advance();
  const file=join(directory,"checkpoint.json"),before=await readFile(file,"utf8");
  for(let i=0;i<40;i++){
   const current=fresh();
   expect((await current.read()).count).toBe(12);
   expect((await current.inspectHealth()).safeToResume).toBe(true);
  }
  expect(await readFile(file,"utf8")).toBe(before);
 }),60000);
});

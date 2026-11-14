import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createRecoveryAssurance} from "../recovery-assurance-v80.js";

async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-v80-integration-"));
 const directory=join(root,"anchor"),auditDirectory=join(root,"audit");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,
  key:"a".repeat(48),keyId:"v80-audit",maxEntries:200});
 const anchor=createTrustedRecoveryAuditAnchor({directory,
  key:"b".repeat(48),keyId:"v80-anchor",auditDirectory,
  readDurableAudit:()=>audit.read(),authorize:async()=>true});
 try{
  await audit.initialize();await anchor.initialize();
  const assess=()=>createRecoveryAssurance({inspectHealth:()=>anchor.inspectHealth()}).assess();
  await run({audit,anchor,assess,directory,auditDirectory});
 }finally{await rm(root,{recursive:true,force:true});}
}

describe("Hyper XSUS Core v8.0 — signed assurance integration",()=>{
 it("accepts initial signed checkpoint",async()=>fixture(async({assess})=>{
  expect((await assess()).safeToResume).toBe(true);
 }));
 it("accepts signed audit advancement",async()=>fixture(async({audit,anchor,assess})=>{
  await audit.append({id:1});await anchor.advance();
  const x=await assess();
  expect(x.safeToResume).toBe(true);
  expect(x.anchor.count).toBe(1);
 }));
 it("accepts 15 sequential signed audit advances",async()=>fixture(async({audit,anchor,assess})=>{
  for(let i=1;i<=15;i++){
   await audit.append({i});await anchor.advance();
   expect((await assess()).anchor.count).toBe(i);
  }
 }),90000);
 it("accepts 25 parallel read-only signed assessments",async()=>fixture(async({assess})=>{
  const results=await Promise.all(Array.from({length:25},()=>assess()));
  expect(results.every(x=>x.safeToResume)).toBe(true);
 }),90000);
 it("blocks checkpoint pending evidence without deleting it",async()=>fixture(async({directory,assess})=>{
  const file=join(directory,"checkpoint.pending");
  await writeFile(file,"manual");
  expect((await assess()).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("manual");
 }));
 it("blocks checkpoint writer lock",async()=>fixture(async({directory,assess})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  expect((await assess()).safeToResume).toBe(false);
 }));
 it("blocks audit pending evidence without deleting it",async()=>fixture(async({auditDirectory,assess})=>{
  const file=join(auditDirectory,"audit.pending");
  await writeFile(file,"manual");
  expect((await assess()).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("manual");
 }));
 it("blocks signed audit rollback behind anchor",async()=>fixture(async({audit,anchor,auditDirectory,assess})=>{
  await audit.append({id:1});
  const file=join(auditDirectory,"audit.json");
  const previous=await readFile(file,"utf8");
  await audit.append({id:2});await anchor.advance();
  await writeFile(file,previous);
  expect((await assess()).safeToResume).toBe(false);
 }));
 it("blocks checkpoint tampering",async()=>fixture(async({directory,assess})=>{
  const file=join(directory,"checkpoint.json");
  const record=JSON.parse(await readFile(file,"utf8"));
  record.count=77;
  await writeFile(file,JSON.stringify(record));
  expect((await assess()).safeToResume).toBe(false);
 }));
});

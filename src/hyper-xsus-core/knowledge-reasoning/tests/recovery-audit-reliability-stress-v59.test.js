import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile,mkdir,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createRecoveryAuditIntegrity} from "../recovery-audit-integrity.js";

async function fixture(run,{maxEntries=300}={}){
 const root=await mkdtemp(join(tmpdir(),"xsus-audit-stress-v59-"));
 const directory=join(root,"audit");
 const options={directory,key:"v".repeat(48),keyId:"v59-stress",maxEntries};
 const make=()=>createDurableRecoveryAudit(options);
 const audit=make();
 const inspect=()=>createRecoveryAuditIntegrity({directory,readDurableAudit:()=>make().read()});
 try{await audit.initialize();await run({root,directory,audit,make,inspect});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v5.9 — durable recovery audit reliability stress",()=>{
 it("preserves 80 sequential writes and authenticated chain through fresh readers",async()=>fixture(async({audit,make,inspect})=>{
  for(let i=1;i<=80;i++){
   const entry=await audit.append({iteration:i,kind:"verified"});
   expect(entry.sequence).toBe(i);
  }
  const restored=await make().read();
  expect(restored.count).toBe(80);
  expect(restored.entries.map(e=>e.payload.iteration)).toEqual(Array.from({length:80},(_,i)=>i+1));
  expect((await inspect().assess({trustedAnchor:{count:80,tip:restored.tip}})).safeToResume).toBe(true);
 }));
 it("maintains authenticated prefix under 30 repeated independent inspections",async()=>fixture(async({audit,inspect})=>{
  const first=await audit.append({iteration:1});
  for(let i=2;i<=20;i++)await audit.append({iteration:i});
  const checks=await Promise.all(Array.from({length:30},()=>inspect().assess({
   trustedAnchor:{count:1,tip:first.hash}
  })));
  expect(checks.every(x=>x.safeToResume&&x.anchored&&x.audit.count===20)).toBe(true);
 }));
 it("survives 20 fresh instance restarts with monotonic sequence",async()=>fixture(async({make,inspect})=>{
  for(let i=1;i<=20;i++){
   await make().append({cycle:i});
   const state=await make().read();
   expect(state.count).toBe(i);
   expect((await inspect().assess({trustedAnchor:{count:i,tip:state.tip}})).safeToResume).toBe(true);
  }
 }));
 it("fails closed on pending crash artifact across 25 inspections without deleting it",async()=>fixture(async({audit,directory,inspect})=>{
  await audit.append({kind:"committed"});
  const pending=join(directory,"audit.pending");
  await writeFile(pending,"incomplete-write");
  const checks=await Promise.all(Array.from({length:25},()=>inspect().assess()));
  expect(checks.every(x=>!x.safeToResume&&x.blockers.includes("AUDIT_PENDING_REVIEW_REQUIRED"))).toBe(true);
  expect(await readFile(pending,"utf8")).toBe("incomplete-write");
  await expect(audit.append({kind:"blocked"})).rejects.toMatchObject({code:"XSUS_DURABLE_AUDIT_PENDING"});
  expect((await audit.read()).count).toBe(1);
 }));
 it("fails closed on writer lock across 25 inspections without stealing it",async()=>fixture(async({audit,directory,inspect})=>{
  await audit.append({kind:"committed"});
  const lock=join(directory,"audit.lock");
  await mkdir(lock);
  const before=await stat(lock);
  const checks=await Promise.all(Array.from({length:25},()=>inspect().assess()));
  expect(checks.every(x=>!x.safeToResume&&x.blockers.includes("AUDIT_WRITER_LOCK_REVIEW_REQUIRED"))).toBe(true);
  await expect(audit.append({kind:"blocked"})).rejects.toMatchObject({code:"XSUS_DURABLE_AUDIT_LOCKED"});
  expect((await stat(lock)).ino).toBe(before.ino);
 }));
 it("detects signed rollback against retained external anchor without mutating audit",async()=>fixture(async({audit,directory,inspect})=>{
  await audit.append({kind:"first"});
  const file=join(directory,"audit.json");
  const old=await readFile(file,"utf8");
  await audit.append({kind:"second"});
  const anchor=await audit.read();
  await writeFile(file,old);
  const checks=await Promise.all(Array.from({length:20},()=>inspect().assess({
   trustedAnchor:{count:anchor.count,tip:anchor.tip}
  })));
  expect(checks.every(x=>x.blockers.includes("AUDIT_ROLLBACK_REVIEW_REQUIRED"))).toBe(true);
  expect(await readFile(file,"utf8")).toBe(old);
 }));
 it("detects 15 independent corruption cases without modifying the damaged evidence",async()=>fixture(async({audit,directory,inspect})=>{
  await audit.append({kind:"original"});
  const file=join(directory,"audit.json");
  const original=await readFile(file,"utf8");
  for(let i=0;i<15;i++){
   const object=JSON.parse(original);
   object.entries[0].payload.kind="tampered-"+i;
   const corrupted=JSON.stringify(object);
   await writeFile(file,corrupted);
   const result=await inspect().assess();
   expect(result.blockers).toContain("AUDIT_INTEGRITY_REVIEW_REQUIRED");
   expect(await readFile(file,"utf8")).toBe(corrupted);
  }
 }));
 it("refuses overflow after 12 entries without evicting any record",async()=>fixture(async({audit,make,inspect})=>{
  for(let i=0;i<12;i++)await audit.append({i});
  const baseline=await make().read();
  for(let i=0;i<8;i++)
   await expect(audit.append({i:100+i})).rejects.toMatchObject({code:"XSUS_DURABLE_AUDIT_FULL"});
  const after=await make().read();
  expect(after.tip).toBe(baseline.tip);
  expect(after.count).toBe(12);
  expect((await inspect().assess()).safeToResume).toBe(true);
 },{maxEntries:12}));
});

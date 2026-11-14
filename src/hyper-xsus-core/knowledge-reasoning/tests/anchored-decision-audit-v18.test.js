import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionAudit} from "../persistent-decision-audit.engine.js";
import {createAuditAnchorStore} from "../audit-anchor-store.js";
import {createAnchoredDecisionAudit} from "../anchored-decision-audit.js";
const key="q".repeat(48);
const result={version:"0.6.0",status:"reviewed",evidenceCount:1,
 decisions:[],contradictions:[],summary:{eligible:0,needsReview:0,blocked:0}};
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-anchored-v18-"));
 const journal=join(dir,"journal.json"),checkpoint=join(dir,"anchor.json");
 const store=createAuditAnchorStore({filePath:checkpoint,key,keyId:"key-1"});
 try{await fn({journal,checkpoint,store});}
 finally{await rm(dir,{recursive:true,force:true});}
}
async function seed(journal,store){
 const a=createPersistentDecisionAudit({filePath:journal});
 await a.load();await a.append({result});
 await store.initialize(a.snapshot());
 a.close();
}
describe("Hyper Audit v1.8.0 — anchored lifecycle",()=>{
 it("verifies an externally provisioned anchor after restart",async()=>{
  await fixture(async({journal,store})=>{
   await seed(journal,store);
   const a=createAnchoredDecisionAudit({audit:createPersistentDecisionAudit({filePath:journal}),anchorStore:store});
   expect((await a.load()).lastSequence).toBe(1);
   expect((await a.append({result})).sequence).toBe(2);
   a.close();
  });
 });
 it("rejects missing external anchor without creating one",async()=>{
  await fixture(async({journal,store})=>{
   const a=createAnchoredDecisionAudit({audit:createPersistentDecisionAudit({filePath:journal}),anchorStore:store});
   await expect(a.load()).rejects.toMatchObject({code:"XSUS_ANCHOR_MISSING"});
   await expect(a.append({result})).rejects.toThrow(/unavailable/);
  });
 });
 it("fails closed on a rollback after restart",async()=>{
  await fixture(async({journal,store})=>{
   const a=createPersistentDecisionAudit({filePath:journal});
   await a.load();await a.append({result});
   const older=await readFile(journal,"utf8");
   await a.append({result});await store.initialize(a.snapshot());a.close();
   await writeFile(journal,older);
   const b=createAnchoredDecisionAudit({audit:createPersistentDecisionAudit({filePath:journal}),anchorStore:store});
   await expect(b.load()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_ROLLBACK"});
  });
 });
 it("rejects a tampered external checkpoint on load",async()=>{
  await fixture(async({journal,checkpoint,store})=>{
   await seed(journal,store);
   const anchor=JSON.parse(await readFile(checkpoint,"utf8"));
   anchor.signature="0".repeat(64);
   await writeFile(checkpoint,JSON.stringify(anchor));
   const a=createAnchoredDecisionAudit({audit:createPersistentDecisionAudit({filePath:journal}),anchorStore:store});
   await expect(a.load()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_SIGNATURE"});
  });
 });
 it("detects a checkpoint tampered with after load before append",async()=>{
  await fixture(async({journal,checkpoint,store})=>{
   await seed(journal,store);
   const a=createAnchoredDecisionAudit({audit:createPersistentDecisionAudit({filePath:journal}),anchorStore:store});
   await a.load();
   const anchor=JSON.parse(await readFile(checkpoint,"utf8"));
   anchor.signature="0".repeat(64);
   await writeFile(checkpoint,JSON.stringify(anchor));
   await expect(a.append({result})).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_SIGNATURE"});
   await expect(a.append({result})).rejects.toThrow(/unavailable/);
  });
 });
});

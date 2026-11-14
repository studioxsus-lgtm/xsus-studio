import {describe,it,expect} from "vitest";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionAudit} from "../persistent-decision-audit.engine.js";
const result={version:"0.6.0",status:"reviewed",evidenceCount:2,
 decisions:[],contradictions:[],summary:{eligible:0,needsReview:0,blocked:0}};
const fixture=async()=>{
 const dir=await mkdtemp(join(tmpdir(),"xsus-audit-"));
 return {dir,path:join(dir,"audit.json"),cleanup:()=>rm(dir,{recursive:true,force:true})};
};
describe("Hyper Persistent Decision Audit v0.8.0",()=>{
 it("persists a verified receipt across restart",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await a.load();const receipt=await a.append({result});a.close();
   const b=createPersistentDecisionAudit({filePath:f.path});
   const recovered=await b.load();
   expect(recovered.entries[0]).toEqual(receipt);
   expect(recovered.lastSequence).toBe(1);
  }finally{await f.cleanup();}
 });
 it("continues sequence and hash chain after restart",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await a.load();const first=await a.append({result});a.close();
   const b=createPersistentDecisionAudit({filePath:f.path});
   await b.load();const second=await b.append({result});
   expect(second.sequence).toBe(2);
   expect(second.previousHash).toBe(first.hash);
  }finally{await f.cleanup();}
 });
 it("rejects tampered committed bytes",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await a.load();await a.append({result});
   const doc=JSON.parse(await readFile(f.path,"utf8"));
   doc.entries[0].evidenceCount=900;
   await writeFile(f.path,JSON.stringify(doc));
   await expect(createPersistentDecisionAudit({filePath:f.path}).load())
    .rejects.toThrow(/hash mismatch/i);
  }finally{await f.cleanup();}
 });
 it("rejects malformed committed JSON instead of resetting",async()=>{
  const f=await fixture();
  try{
   await writeFile(f.path,"{bad-json");
   const a=createPersistentDecisionAudit({filePath:f.path});
   await expect(a.load()).rejects.toThrow();
   await expect(a.append({result})).rejects.toThrow(/unavailable/);
  }finally{await f.cleanup();}
 });
 it("ignores orphan temp files and recovers committed journal",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await a.load();await a.append({result});
   await writeFile(join(f.dir,".audit.json.crashed.tmp"),"{partial");
   const b=createPersistentDecisionAudit({filePath:f.path});
   expect((await b.load()).lastSequence).toBe(1);
  }finally{await f.cleanup();}
 });
 it("serializes concurrent append operations",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await a.load();
   const receipts=await Promise.all(Array.from({length:20},()=>a.append({result})));
   expect(receipts.map(x=>x.sequence)).toEqual(
    Array.from({length:20},(_,i)=>i+1));
   const b=createPersistentDecisionAudit({filePath:f.path});
   expect((await b.load()).lastSequence).toBe(20);
  }finally{await f.cleanup();}
 });
 it("retains bounded chain with a persisted anchor",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path,maxEntries:3});
   await a.load();
   const receipts=[];
   for(let i=0;i<8;i++)receipts.push(await a.append({result}));
   const b=createPersistentDecisionAudit({filePath:f.path,maxEntries:3});
   const s=await b.load();
   expect(s.entries).toHaveLength(3);
   expect(s.anchorHash).toBe(receipts[4].hash);
   expect(s.entries[0].previousHash).toBe(s.anchorHash);
  }finally{await f.cleanup();}
 });
 it("does not persist failed invalid results",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await a.load();
   await expect(a.append({result:{}})).rejects.toThrow(TypeError);
   expect(a.snapshot().entries).toHaveLength(0);
  }finally{await f.cleanup();}
 });
 it("does not replace committed journal if temp write fails",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await a.load();await a.append({result});
   const bytes=await readFile(f.path,"utf8");
   const failing=createPersistentDecisionAudit({filePath:f.path,
    fsOps:{writeFile:async()=>{throw new Error("disk full");}}});
   await failing.load();
   await expect(failing.append({result})).rejects.toThrow("disk full");
   expect(await readFile(f.path,"utf8")).toBe(bytes);
   await expect(failing.append({result})).rejects.toThrow(/unavailable/);
  }finally{await f.cleanup();}
 });
 it("does not allow append before load or after close",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await expect(a.append({result})).rejects.toThrow(/unavailable/);
   await a.load();a.close();
   await expect(a.append({result})).rejects.toThrow(/unavailable/);
  }finally{await f.cleanup();}
 });
 it("rejects invalid configuration",()=>{
  expect(()=>createPersistentDecisionAudit()).toThrow(TypeError);
  expect(()=>createPersistentDecisionAudit({filePath:"x",maxEntries:0}))
   .toThrow(TypeError);
 });
});

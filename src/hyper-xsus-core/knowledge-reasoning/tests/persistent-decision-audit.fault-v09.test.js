import {describe,it,expect} from "vitest";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionAudit} from "../persistent-decision-audit.engine.js";
const result={version:"0.6.0",status:"reviewed",evidenceCount:1,
 decisions:[],contradictions:[],summary:{eligible:0,needsReview:0,blocked:0}};
const fixture=async()=>{
 const dir=await mkdtemp(join(tmpdir(),"xsus-audit-fault-"));
 return {filePath:join(dir,"journal.json"),cleanup:()=>rm(dir,{recursive:true,force:true})};
};
describe("Hyper Persistent Audit v0.9.0 — fault matrix",()=>{
 it("fails closed when rename rejects and preserves committed bytes",async()=>{
  const f=await fixture();
  try{
   const initial=createPersistentDecisionAudit({filePath:f.filePath});
   await initial.load();await initial.append({result});
   const bytes=await readFile(f.filePath,"utf8");
   const failing=createPersistentDecisionAudit({filePath:f.filePath,
    fsOps:{rename:async()=>{throw new Error("rename denied");}}});
   await failing.load();
   await expect(failing.append({result})).rejects.toThrow("rename denied");
   expect(await readFile(f.filePath,"utf8")).toBe(bytes);
   await expect(failing.append({result})).rejects.toThrow(/unavailable/);
  }finally{await f.cleanup();}
 });
 it("fails closed if directory fsync fails after rename",async()=>{
  const f=await fixture();
  try{
   const initial=createPersistentDecisionAudit({filePath:f.filePath});
   await initial.load();await initial.append({result});
   const {open}=await import("node:fs/promises");
   const failing=createPersistentDecisionAudit({filePath:f.filePath,
    fsOps:{open:async(path,flags)=>{
     if(path===f.filePath.slice(0,f.filePath.lastIndexOf("/")))
      throw new Error("directory sync unavailable");
     return open(path,flags);
    }}});
   await failing.load();
   await expect(failing.append({result})).rejects.toThrow(
    "directory sync unavailable");
   await expect(failing.append({result})).rejects.toThrow(/unavailable/);
   const recovered=createPersistentDecisionAudit({filePath:f.filePath});
   expect((await recovered.load()).lastSequence).toBe(2);
  }finally{await f.cleanup();}
 });
 it("rejects altered previous hash even when current hash is unchanged",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.filePath});
   await a.load();await a.append({result});await a.append({result});
   const doc=JSON.parse(await readFile(f.filePath,"utf8"));
   doc.entries[1].previousHash="GENESIS";
   await writeFile(f.filePath,JSON.stringify(doc));
   await expect(createPersistentDecisionAudit({filePath:f.filePath}).load())
    .rejects.toThrow(/invalid audit entry/i);
  }finally{await f.cleanup();}
 });
 it("rejects unexpected personal fields in a committed journal",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.filePath});
   await a.load();await a.append({result});
   const doc=JSON.parse(await readFile(f.filePath,"utf8"));
   doc.entries[0].principalId="alice";
   await writeFile(f.filePath,JSON.stringify(doc));
   await expect(createPersistentDecisionAudit({filePath:f.filePath}).load())
    .rejects.toThrow(/invalid audit entry/i);
  }finally{await f.cleanup();}
 });
 it("rejects missing journal continuity after retained entries are removed",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.filePath});
   await a.load();await a.append({result});await a.append({result});
   const doc=JSON.parse(await readFile(f.filePath,"utf8"));
   doc.entries.shift();
   await writeFile(f.filePath,JSON.stringify(doc));
   await expect(createPersistentDecisionAudit({filePath:f.filePath}).load())
    .rejects.toThrow(/invalid audit entry/i);
  }finally{await f.cleanup();}
 });
});

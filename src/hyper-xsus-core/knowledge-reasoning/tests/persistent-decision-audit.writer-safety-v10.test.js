import {describe,it,expect} from "vitest";
import {mkdtemp,readFile,writeFile,open,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionAudit} from "../persistent-decision-audit.engine.js";
const result={version:"0.6.0",status:"reviewed",evidenceCount:1,
 decisions:[],contradictions:[],summary:{eligible:0,needsReview:0,blocked:0}};
const fixture=async()=>{const dir=await mkdtemp(join(tmpdir(),"xsus-lock-"));
 return {path:join(dir,"audit.json"),cleanup:()=>rm(dir,{recursive:true,force:true})};};
describe("Hyper Audit v1.0.0 — cross-instance writer safety",()=>{
 it("two instances loaded before writes preserve both receipts",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   const b=createPersistentDecisionAudit({filePath:f.path});
   await a.load();await b.load();
   const first=await a.append({result});
   const second=await b.append({result});
   expect(second.sequence).toBe(2);
   expect(second.previousHash).toBe(first.hash);
   const recovered=createPersistentDecisionAudit({filePath:f.path});
   expect((await recovered.load()).lastSequence).toBe(2);
  }finally{await f.cleanup();}
 });
 it("rejects existing lock without overwriting committed bytes",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await a.load();await a.append({result});
   const before=await readFile(f.path,"utf8");
   const lock=await open(f.path+".lock","wx");
   try{
    await expect(a.append({result})).rejects.toMatchObject({
     code:"XSUS_AUDIT_LOCKED"});
    expect(await readFile(f.path,"utf8")).toBe(before);
   }finally{await lock.close();}
  }finally{await f.cleanup();}
 });
 it("rejects malformed on-disk journal during refreshed append",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await a.load();await a.append({result});
   await writeFile(f.path,"{bad-json");
   await expect(a.append({result})).rejects.toThrow(SyntaxError);
   await expect(a.append({result})).rejects.toThrow(/unavailable/);
  }finally{await f.cleanup();}
 });
 it("fails closed if a committed journal disappears",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await a.load();await a.append({result});
   await rm(f.path);
   await expect(a.append({result})).rejects.toThrow(/disappeared/);
  }finally{await f.cleanup();}
 });
 it("releases lock after successful commit",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path});
   await a.load();await a.append({result});
   await expect(readFile(f.path+".lock")).rejects.toMatchObject({code:"ENOENT"});
  }finally{await f.cleanup();}
 });
 it("releases lock after write failure",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.path,
    fsOps:{writeFile:async()=>{throw new Error("disk unavailable");}}});
   await a.load();
   await expect(a.append({result})).rejects.toThrow("disk unavailable");
   await expect(readFile(f.path+".lock")).rejects.toMatchObject({code:"ENOENT"});
  }finally{await f.cleanup();}
 });
});

import {describe,it,expect} from "vitest";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionAudit} from "../persistent-decision-audit.engine.js";

const result={version:"0.6.0",status:"reviewed",evidenceCount:1,
 decisions:[],contradictions:[],summary:{eligible:0,needsReview:0,blocked:0}};
async function fixture(){
 const dir=await mkdtemp(join(tmpdir(),"xsus-continuity-"));
 return {file:join(dir,"audit.json"),other:join(dir,"other.json"),
  cleanup:()=>rm(dir,{recursive:true,force:true})};
}
describe("Hyper Audit v1.5.0 — journal continuity",()=>{
 it("rejects a valid but rolled-back committed journal",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.file});
   await a.load();await a.append({result});
   const earlier=await readFile(f.file,"utf8");
   await a.append({result});
   await writeFile(f.file,earlier);
   await expect(a.append({result})).rejects.toMatchObject({code:"XSUS_AUDIT_ROLLBACK"});
   await expect(a.append({result})).rejects.toThrow(/unavailable/);
  }finally{await f.cleanup();}
 });
 it("rejects a valid but divergent same-sequence journal",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.file});
   const b=createPersistentDecisionAudit({filePath:f.other});
   await a.load();await b.load();
   await a.append({result});
   await b.append({result:{...result,evidenceCount:2}});
   await writeFile(f.file,await readFile(f.other));
   await expect(a.append({result})).rejects.toMatchObject({code:"XSUS_AUDIT_FORK"});
  }finally{await f.cleanup();}
 });
 it("allows a second writer to advance history without false rollback",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.file});
   const b=createPersistentDecisionAudit({filePath:f.file});
   await a.load();await b.load();
   expect((await a.append({result})).sequence).toBe(1);
   expect((await b.append({result})).sequence).toBe(2);
   expect((await a.append({result})).sequence).toBe(3);
   expect(JSON.parse(await readFile(f.file,"utf8")).lastSequence).toBe(3);
  }finally{await f.cleanup();}
 });
});

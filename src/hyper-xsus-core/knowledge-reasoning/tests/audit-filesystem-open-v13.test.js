import {describe,it,expect} from "vitest";
import {mkdtemp,writeFile,readFile,symlink,chmod,rm} from "node:fs/promises";
import {constants} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionAudit} from "../persistent-decision-audit.engine.js";
const result={version:"0.6.0",status:"reviewed",evidenceCount:1,
 decisions:[],contradictions:[],summary:{eligible:0,needsReview:0,blocked:0}};
const fixture=async()=>{const dir=await mkdtemp(join(tmpdir(),"xsus-open-"));
 return {file:join(dir,"journal.json"),dir,
 cleanup:()=>rm(dir,{recursive:true,force:true})};};
describe("Hyper Audit v1.3.0 — opened file security",()=>{
 it("strict load uses no-follow flags for existing journal",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.file,strictFilesystem:true});
   await a.load();await a.append({result});
   const seen=[];
   const {open}=await import("node:fs/promises");
   const b=createPersistentDecisionAudit({filePath:f.file,strictFilesystem:true,
    fsOps:{open:async(path,flags,...rest)=>{
     if(path===f.file)seen.push(flags);
     return open(path,flags,...rest);
    }}});
   expect((await b.load()).lastSequence).toBe(1);
   expect(seen.length).toBe(1);
   expect(seen[0]&constants.O_NOFOLLOW).toBe(constants.O_NOFOLLOW);
  }finally{await f.cleanup();}
 });
 it("strict load rejects a symlink substituted after preflight",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.file,strictFilesystem:true});
   await a.load();await a.append({result});
   const target=join(f.dir,"target");
   await writeFile(target,await readFile(f.file));
   const {open}=await import("node:fs/promises");
   const {rename}=await import("node:fs/promises");
   let swapped=false;
   const b=createPersistentDecisionAudit({filePath:f.file,strictFilesystem:true,
    fsOps:{open:async(path,flags,...rest)=>{
     if(path===f.file&&!swapped){
      swapped=true;
      await rename(f.file,join(f.dir,"original"));
      await symlink(target,f.file);
     }
     return open(path,flags,...rest);
    }}});
   await expect(b.load()).rejects.toThrow();
   expect(swapped).toBe(true);
  }finally{await f.cleanup();}
 });
 it.skipIf(process.platform==="win32")("strict load checks opened descriptor permissions",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.file,strictFilesystem:true});
   await a.load();await a.append({result});
   const {open}=await import("node:fs/promises");
   let changed=false;
   const b=createPersistentDecisionAudit({filePath:f.file,strictFilesystem:true,
    fsOps:{open:async(path,flags,...rest)=>{
     if(path===f.file&&!changed){
      changed=true;await chmod(f.file,0o644);
     }
     return open(path,flags,...rest);
    }}});
   await expect(b.load()).rejects.toMatchObject({code:"XSUS_AUDIT_UNSAFE_PATH"});
  }finally{await f.cleanup();}
 });
});

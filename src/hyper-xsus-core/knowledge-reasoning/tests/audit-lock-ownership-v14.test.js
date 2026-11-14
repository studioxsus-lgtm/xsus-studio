import {describe,it,expect} from "vitest";
import {mkdtemp,readFile,writeFile,rename,rm,lstat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionAudit} from "../persistent-decision-audit.engine.js";

const result={version:"0.6.0",status:"reviewed",evidenceCount:1,
 decisions:[],contradictions:[],summary:{eligible:0,needsReview:0,blocked:0}};
async function fixture(){
 const dir=await mkdtemp(join(tmpdir(),"xsus-lock-identity-"));
 return {path:join(dir,"audit.json"),
  cleanup:()=>rm(dir,{recursive:true,force:true})};
}
describe("Hyper Audit v1.4.0 — lock ownership integrity",()=>{
 it("normal lock release preserves journal and removes owned lock",async()=>{
  const f=await fixture();
  try{
   const audit=createPersistentDecisionAudit({filePath:f.path});
   await audit.load();
   expect((await audit.append({result})).sequence).toBe(1);
   await expect(lstat(f.path+".lock")).rejects.toMatchObject({code:"ENOENT"});
   expect((await audit.append({result})).sequence).toBe(2);
  }finally{await f.cleanup();}
 });
 it("does not unlink another actor's replacement lock",async()=>{
  const f=await fixture();
  try{
   let injected=false;
   const audit=createPersistentDecisionAudit({filePath:f.path,fsOps:{
    readFile:async(path,...args)=>{
     if(path===f.path&&!injected&&await lstat(f.path+".lock").then(()=>true,()=>false)){
      injected=true;
      await rename(f.path+".lock",f.path+".original-lock");
      await writeFile(f.path+".lock","replacement",{mode:0o600});
     }
     return readFile(path,...args);
    }
   }});
   await audit.load();
   await expect(audit.append({result})).rejects.toMatchObject({
    code:"XSUS_AUDIT_LOCK_CHANGED"});
   expect(injected).toBe(true);
   expect(await readFile(f.path+".lock","utf8")).toBe("replacement");
   await expect(audit.append({result})).rejects.toThrow(/unavailable/);
  }finally{await f.cleanup();}
 });
 it("does not remove a substituted symlink lock",async()=>{
  const f=await fixture();
  try{
   const {symlink}=await import("node:fs/promises");
   const target=join(f.path+"-target");
   await writeFile(target,"sentinel");
   let injected=false;
   const audit=createPersistentDecisionAudit({filePath:f.path,fsOps:{
    readFile:async(path,...args)=>{
     if(path===f.path&&!injected&&await lstat(f.path+".lock").then(()=>true,()=>false)){
      injected=true;
      await rename(f.path+".lock",f.path+".original-lock");
      await symlink(target,f.path+".lock");
     }
     return readFile(path,...args);
    }
   }});
   await audit.load();
   await expect(audit.append({result})).rejects.toMatchObject({
    code:"XSUS_AUDIT_LOCK_CHANGED"});
   expect(await readFile(target,"utf8")).toBe("sentinel");
   expect((await lstat(f.path+".lock")).isSymbolicLink()).toBe(true);
  }finally{await f.cleanup();}
 });
});

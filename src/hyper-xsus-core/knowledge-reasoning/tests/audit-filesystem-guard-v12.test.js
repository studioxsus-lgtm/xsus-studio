import {describe,it,expect} from "vitest";
import {mkdtemp,writeFile,chmod,symlink,readFile,rm,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createAuditFilesystemGuard} from "../audit-filesystem-guard.js";
import {createPersistentDecisionAudit} from "../persistent-decision-audit.engine.js";
const result={version:"0.6.0",status:"reviewed",evidenceCount:1,
 decisions:[],contradictions:[],summary:{eligible:0,needsReview:0,blocked:0}};
const fixture=async()=>{const dir=await mkdtemp(join(tmpdir(),"xsus-guard-"));
 return {dir,file:join(dir,"audit.json"),cleanup:()=>rm(dir,{recursive:true,force:true})};};
describe("Hyper Audit v1.2.0 — filesystem guard",()=>{
 it("rejects relative paths in strict mode",()=>{
  expect(()=>createAuditFilesystemGuard({filePath:"relative.json"}))
   .toMatchObject;
  expect(()=>createAuditFilesystemGuard({filePath:"relative.json"}))
   .toThrow(/absolute normalized/);
 });
 it("allows missing journal in trusted directory",async()=>{
  const f=await fixture();
  try{expect(await createAuditFilesystemGuard({filePath:f.file}).check()).toBe(true);}
  finally{await f.cleanup();}
 });
 it("rejects symlink journal",async()=>{
  const f=await fixture();
  try{
   await writeFile(join(f.dir,"target"),"data");
   await symlink(join(f.dir,"target"),f.file);
   await expect(createAuditFilesystemGuard({filePath:f.file}).check())
    .rejects.toMatchObject({code:"XSUS_AUDIT_UNSAFE_PATH"});
  }finally{await f.cleanup();}
 });
 it("rejects symlink lock",async()=>{
  const f=await fixture();
  try{
   await writeFile(join(f.dir,"target"),"data");
   await symlink(join(f.dir,"target"),f.file+".lock");
   await expect(createAuditFilesystemGuard({filePath:f.file}).check())
    .rejects.toMatchObject({code:"XSUS_AUDIT_UNSAFE_PATH"});
  }finally{await f.cleanup();}
 });
 it("rejects symlink parent directory",async()=>{
  const f=await fixture();
  try{
   await symlink(f.dir,join(f.dir,"alias"));
   await expect(createAuditFilesystemGuard({
    filePath:join(f.dir,"alias","audit.json")}).check())
    .rejects.toMatchObject({code:"XSUS_AUDIT_UNSAFE_PATH"});
  }finally{await f.cleanup();}
 });
 it.skipIf(process.platform==="win32")("rejects group-readable journal",async()=>{
  const f=await fixture();
  try{
   await writeFile(f.file,"data");await chmod(f.file,0o644);
   await expect(createAuditFilesystemGuard({filePath:f.file}).check())
    .rejects.toMatchObject({code:"XSUS_AUDIT_UNSAFE_PATH"});
  }finally{await f.cleanup();}
 });
 it("strict mode creates owner-only journal and recovers",async()=>{
  const f=await fixture();
  try{
   const a=createPersistentDecisionAudit({filePath:f.file,strictFilesystem:true});
   await a.load();await a.append({result});
   if(process.platform!=="win32")
    expect((await stat(f.file)).mode&0o777).toBe(0o600);
   const b=createPersistentDecisionAudit({filePath:f.file,strictFilesystem:true});
   expect((await b.load()).lastSequence).toBe(1);
  }finally{await f.cleanup();}
 });
 it("strict mode refuses symlink journal without replacing target",async()=>{
  const f=await fixture();
  try{
   const target=join(f.dir,"target");
   await writeFile(target,"private");
   await symlink(target,f.file);
   const a=createPersistentDecisionAudit({filePath:f.file,strictFilesystem:true});
   await expect(a.load()).rejects.toMatchObject({code:"XSUS_AUDIT_UNSAFE_PATH"});
   expect(await readFile(target,"utf8")).toBe("private");
  }finally{await f.cleanup();}
 });
});

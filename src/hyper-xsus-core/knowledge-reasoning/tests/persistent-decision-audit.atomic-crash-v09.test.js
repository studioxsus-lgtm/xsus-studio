/**
 * Hyper XSUS Core v0.9.0 — real-process crash injection.
 * Kill a child only after it confirms the precise atomic-write boundary.
 * This verifies recovery of the committed journal, not durability guarantees
 * across power loss or storage-controller failures.
 */
import {describe,it,expect} from "vitest";
import {spawn} from "node:child_process";
import {mkdtemp,readFile,rm,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionAudit} from "../persistent-decision-audit.engine.js";

const moduleUrl=new URL("../persistent-decision-audit.engine.js",import.meta.url).href;
const result={version:"0.6.0",status:"reviewed",evidenceCount:2,
 decisions:[],contradictions:[],
 summary:{eligible:0,needsReview:0,blocked:0}};
const childCode=`
import {createPersistentDecisionAudit} from ${JSON.stringify(moduleUrl)};
import {rename as nativeRename,open as nativeOpen} from "node:fs/promises";
const [filePath,stage]=process.argv.slice(1);
const result=${JSON.stringify(result)};
const hold=()=>new Promise(()=>{setInterval(()=>{},1000);});
const fsOps=stage==="before-rename"?
 {rename:async()=>{process.send?.("boundary");await hold();}}:
 {open:async(path,flags)=>{
   if(path===filePath.slice(0,filePath.lastIndexOf("/"))&&flags==="r"){
    process.send?.("boundary");await hold();
   }
   return nativeOpen(path,flags);
 }};
const audit=createPersistentDecisionAudit({filePath,fsOps});
await audit.load();
await audit.append({result});
process.send?.("unexpected-completion");
`;
async function killAtBoundary(filePath,stage){
 const child=spawn(process.execPath,["--input-type=module","-e",childCode,filePath,stage],
  {stdio:["ignore","ignore","pipe","ipc"]});
 let stderr="";
 child.stderr.on("data",x=>{stderr+=String(x);});
 let timer;
 try{
  const boundary=await new Promise((resolve,reject)=>{
   timer=setTimeout(()=>reject(new Error("Child boundary timeout: "+stderr)),10000);
   child.on("message",m=>{
    if(m==="boundary")resolve(m);
    else reject(new Error("Child completed unexpectedly"));
   });
   child.on("error",reject);
   child.on("exit",(code,signal)=>reject(new Error(
    "Child exited before boundary: "+code+" "+signal+" "+stderr)));
  });
  expect(boundary).toBe("boundary");
  const stopped=new Promise((resolve,reject)=>{
   child.once("exit",(code,signal)=>resolve({code,signal}));
   child.once("error",reject);
  });
  expect(child.kill("SIGKILL")).toBe(true);
  expect((await stopped).signal).toBe("SIGKILL");
 }finally{
  clearTimeout(timer);
  if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
 }
}
const suite=process.platform==="win32"?describe.skip:describe;
suite("Hyper Persistent Audit v0.9.0 — real SIGKILL boundaries",()=>{
 it("preserves old committed bytes if killed before rename",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"xsus-audit-crash-"));
  try{
   const filePath=join(dir,"audit.json");
   const audit=createPersistentDecisionAudit({filePath});
   await audit.load();await audit.append({result});
   const before=await readFile(filePath,"utf8");
   await killAtBoundary(filePath,"before-rename");
   expect(await readFile(filePath,"utf8")).toBe(before);
   const recovered=createPersistentDecisionAudit({filePath});
   expect((await recovered.load()).lastSequence).toBe(1);
   await expect(recovered.append({result})).rejects.toMatchObject({code:"XSUS_AUDIT_LOCKED"});
   // Operator verified the child exited before removing its orphan lock.
   await unlink(filePath+".lock");
   expect((await recovered.append({result})).sequence).toBe(2);
  }finally{await rm(dir,{recursive:true,force:true});}
 },20000);
 it("recovers renamed journal if killed before directory sync",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"xsus-audit-crash-"));
  try{
   const filePath=join(dir,"audit.json");
   const audit=createPersistentDecisionAudit({filePath});
   await audit.load();await audit.append({result});
   await killAtBoundary(filePath,"after-rename");
   const recovered=createPersistentDecisionAudit({filePath});
   expect((await recovered.load()).lastSequence).toBe(2);
   await expect(recovered.append({result})).rejects.toMatchObject({code:"XSUS_AUDIT_LOCKED"});
   // Explicit orphan-lock recovery; never remove a live writer lock.
   await unlink(filePath+".lock");
   expect((await recovered.append({result})).sequence).toBe(3);
  }finally{await rm(dir,{recursive:true,force:true});}
 },20000);
});

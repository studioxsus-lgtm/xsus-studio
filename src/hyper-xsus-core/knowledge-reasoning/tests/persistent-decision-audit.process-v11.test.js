/**
 * Hyper XSUS Core v1.1.0 — independent-process audit writer tests.
 * Exercises real Node processes, not two instances in one JS runtime.
 */
import {describe,it,expect} from "vitest";
import {spawn} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionAudit} from "../persistent-decision-audit.engine.js";

const moduleUrl=new URL("../persistent-decision-audit.engine.js",import.meta.url).href;
const result={version:"0.6.0",status:"reviewed",evidenceCount:1,
 decisions:[],contradictions:[],summary:{eligible:0,needsReview:0,blocked:0}};
const script=`
import {createPersistentDecisionAudit} from ${JSON.stringify(moduleUrl)};
const [filePath,mode]=process.argv.slice(1);
const result=${JSON.stringify(result)};
const audit=createPersistentDecisionAudit({filePath});
await audit.load();
if(mode==="hold"){
 const fs=await import("node:fs/promises");
 const handle=await fs.open(filePath+".lock","wx",0o600);
 process.send?.("locked");
 await new Promise(resolve=>process.on("message",m=>m==="release"&&resolve()));
 await handle.close();
 await fs.unlink(filePath+".lock");
 process.send?.("released");
}else{
 try{const receipt=await audit.append({result});
  process.send?.({sequence:receipt.sequence,hash:receipt.hash});}
 catch(e){process.send?.({error:e.code||e.message});}
}
`;
function child(path,mode){
 return spawn(process.execPath,["--input-type=module","-e",script,path,mode],
  {stdio:["ignore","ignore","pipe","ipc"]});
}
function nextMessage(proc,timeout=10000){
 return new Promise((resolve,reject)=>{
  let timer;
  const clean=()=>{clearTimeout(timer);proc.off("message",message);
   proc.off("error",error);proc.off("exit",exit);};
  const message=m=>{clean();resolve(m);};
  const error=e=>{clean();reject(e);};
  const exit=(code,signal)=>{clean();reject(new Error(
   "Child exited without response: "+code+" "+signal));};
  timer=setTimeout(()=>{clean();reject(new Error("Child IPC timeout"));},timeout);
  proc.once("message",message);proc.once("error",error);proc.once("exit",exit);
 });
}
async function fixture(){
 const dir=await mkdtemp(join(tmpdir(),"xsus-process-audit-"));
 const path=join(dir,"audit.json");
 const audit=createPersistentDecisionAudit({filePath:path});
 await audit.load();await audit.append({result});
 return {path,cleanup:()=>rm(dir,{recursive:true,force:true})};
}
describe("Hyper Audit v1.1.0 — independent process safety",()=>{
 it("independent processes preserve sequential committed receipts",async()=>{
  const f=await fixture();
  let a,b;
  try{
   a=child(f.path,"append");
   expect((await nextMessage(a)).sequence).toBe(2);
   b=child(f.path,"append");
   expect((await nextMessage(b)).sequence).toBe(3);
   const recovered=createPersistentDecisionAudit({filePath:f.path});
   const journal=await recovered.load();
   expect(journal.lastSequence).toBe(3);
   expect(journal.entries[2].previousHash).toBe(journal.entries[1].hash);
  }finally{a?.kill();b?.kill();await f.cleanup();}
 },25000);
 it("a live process lock rejects a second process without journal damage",async()=>{
  const f=await fixture();
  const holder=child(f.path,"hold");
  let writer;
  try{
   expect(await nextMessage(holder)).toBe("locked");
   const before=await readFile(f.path,"utf8");
   writer=child(f.path,"append");
   expect(await nextMessage(writer)).toEqual({error:"XSUS_AUDIT_LOCKED"});
   expect(await readFile(f.path,"utf8")).toBe(before);
   holder.send("release");
   expect(await nextMessage(holder)).toBe("released");
   const retry=child(f.path,"append");
   try{expect((await nextMessage(retry)).sequence).toBe(2);}
   finally{retry.kill();}
  }finally{holder.kill();writer?.kill();await f.cleanup();}
 },25000);
});

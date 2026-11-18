import {describe,it,expect} from "vitest";
import {spawn} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const worker=fileURLToPath(new URL("./fixtures/phase39-journal-worker.mjs",import.meta.url));
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase39-"));
 try{return await fn(join(dir,"journal.json"));}
 finally{await rm(dir,{recursive:true,force:true});}};
function start(mode,path,id="phase39"){
 const child=spawn(process.execPath,[worker,mode,path,id],{stdio:["pipe","pipe","pipe"]});
 let stdout="",stderr="";
 child.stdout.on("data",chunk=>{stdout+=chunk;});
 child.stderr.on("data",chunk=>{stderr+=chunk;});
 const done=new Promise((resolve,reject)=>{
  child.once("error",reject);
  child.once("close",(code,signal)=>resolve({code,signal,stdout,stderr}));
 });
 return {child,done,output:()=>stdout};
}
async function run(mode,path,id){
 const proc=start(mode,path,id);
 const timer=setTimeout(()=>proc.child.kill("SIGKILL"),5000);
 try{return await proc.done;}finally{clearTimeout(timer);}
}
async function waitForLock(proc){
 const deadline=Date.now()+3000;
 while(!proc.output().includes("LOCKED")){
  if(Date.now()>deadline)throw Error("Lock holder did not acquire lock");
  await new Promise(resolve=>setTimeout(resolve,10));
 }
}
describe("Hyper phase 39 — real cross-process journal behavior",()=>{
 it("persists in one Node process and recovers in another",async()=>fixture(async path=>{
  const saved=await run("save",path);
  expect(saved.code).toBe(0);
  const loaded=await run("load",path);
  expect(loaded.code).toBe(0);
  expect(JSON.parse(loaded.stdout.trim())).toMatchObject({recovered:true,executionAuthorized:false});
 }));
 it("refuses a conflicting request from a different Node process",async()=>fixture(async path=>{
  expect((await run("save",path)).code).toBe(0);
  const before=await readFile(path,"utf8");
  const conflicting=await run("save",path,"different");
  expect(conflicting.code).toBe(1);
  expect(conflicting.stderr).toContain("JOURNAL_CONFLICT");
  expect(await readFile(path,"utf8")).toBe(before);
 }));
 it("refuses a concurrent process while another process owns the lock",async()=>fixture(async path=>{
  const holder=start("hold",path);
  try{
   await waitForLock(holder);
   const contender=await run("save",path);
   expect(contender.code).toBe(1);
   expect(contender.stderr).toContain("XSUS_FILE_LOCK_BUSY");
  }finally{
   // End the parent write stream after the release signal. The worker
   // pauses its read stream and should exit normally after lock cleanup.
   if(!holder.child.killed)holder.child.stdin.end("release");
   const timer=setTimeout(()=>holder.child.kill("SIGKILL"),5000);
   try{
    const stopped=await holder.done;
    expect(stopped).toMatchObject({code:0,signal:null});
   }finally{clearTimeout(timer);}
  }
  expect((await run("save",path)).code).toBe(0);
 }));
 it("retains a fail-closed stale lock after forced process termination",async()=>fixture(async path=>{
  const holder=start("hold",path);
  try{
   await waitForLock(holder);
   holder.child.kill("SIGKILL");
   const stopped=await holder.done;
   expect(stopped.signal).toBe("SIGKILL");
   const contender=await run("save",path);
   expect(contender.code).toBe(1);
   expect(contender.stderr).toContain("XSUS_FILE_LOCK_BUSY");
  }finally{if(holder.child.exitCode===null)holder.child.kill("SIGKILL");}
 }));
});

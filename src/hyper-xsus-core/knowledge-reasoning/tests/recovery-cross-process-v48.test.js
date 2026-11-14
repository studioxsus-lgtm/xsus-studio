import {describe,it,expect} from "vitest";
import {spawn} from "node:child_process";
import {mkdtemp,rm,mkdir,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
const helper=fileURLToPath(new URL("./helpers/recovery-cross-process-child-v48.mjs",import.meta.url));
const report=n=>({sequence:n,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]});
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-cross-process-v48-"));
 const archiveDirectory=join(root,"archive"),checkpointDirectory=join(root,"checkpoint");
 const make=()=>createIncidentRecoveryIntegration({
  archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
  checkpointKey:"b".repeat(48),archiveKeyId:"process-archive",
  checkpointKeyId:"process-checkpoint",authorize:async()=>true
 });
 try{await fn({make,archiveDirectory,checkpointDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
function run(archiveDirectory,checkpointDirectory,mode,sequence){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[helper,archiveDirectory,checkpointDirectory,mode,...(sequence===undefined?[]:[String(sequence)])],{stdio:["ignore","pipe","pipe"]});
  let out="",err="";
  const timeout=setTimeout(()=>{child.kill("SIGKILL");reject(new Error("Subprocess timeout: "+err));},12000);
  child.stdout.on("data",b=>{out+=b.toString();});
  child.stderr.on("data",b=>{err+=b.toString();});
  child.on("error",e=>{clearTimeout(timeout);reject(e);});
  child.on("exit",(code,signal)=>{
   clearTimeout(timeout);
   try{
    if(signal)throw new Error("Unexpected child signal "+signal);
    const last=out.trim().split("\n").at(-1);
    const response=JSON.parse(last);
    if(response.ok!==(code===0))throw new Error("Child exit/result mismatch "+code+": "+out+" "+err);
    resolve(response);
   }catch(e){reject(e);}
  });
 });
}
function killDuringReview(archiveDirectory,checkpointDirectory){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[helper,archiveDirectory,checkpointDirectory,"pause-review"],{stdio:["ignore","pipe","pipe"]});
  let out="",err="",ready=false;
  const timeout=setTimeout(()=>{child.kill("SIGKILL");reject(new Error("Reviewer readiness timeout "+err));},12000);
  child.stdout.on("data",b=>{
   out+=b.toString();
   if(!ready&&out.includes("REVIEW_READY")){ready=true;child.kill("SIGKILL");}
  });
  child.stderr.on("data",b=>{err+=b.toString();});
  child.on("error",e=>{clearTimeout(timeout);reject(e);});
  child.on("exit",(code,signal)=>{
   clearTimeout(timeout);
   if(ready&&signal==="SIGKILL")resolve();
   else reject(new Error("Unexpected reviewer termination "+code+"/"+signal+" "+out+" "+err));
  });
 });
}
describe("Hyper Audit v4.8 — independent OS process recovery",()=>{
 it("two subprocesses competing for the same signed tail produce one promotion",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));
  const outcomes=await Promise.all([run(archiveDirectory,checkpointDirectory,"promote"),run(archiveDirectory,checkpointDirectory,"promote")]);
  expect(outcomes.filter(x=>x.ok)).toHaveLength(1);
  expect(outcomes.filter(x=>!x.ok)).toHaveLength(1);
  expect((await make().readCheckpoint()).count).toBe(1);
 }));
 it("concurrent independent process appends preserve signed sequence",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  await make().initializeCheckpoint();
  const outcomes=await Promise.all(Array.from({length:4},(_,i)=>run(archiveDirectory,checkpointDirectory,"append",i+1)));
  const successful=outcomes.filter(x=>x.ok).length;
  expect(successful).toBeGreaterThanOrEqual(1);
  const archive=await make().verifyArchive();
  expect(archive.count).toBe(successful);
  expect(archive.entries.map(e=>e.sequence)).toEqual(Array.from({length:successful},(_,i)=>i+1));
 }));
 it("SIGKILL during external reviewer leaves checkpoint unchanged and permits later authorized promotion",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));
  await killDuringReview(archiveDirectory,checkpointDirectory);
  expect((await make().readCheckpoint()).count).toBe(0);
  expect((await make().inspect()).blockers).toEqual(["UNANCHORED_ARCHIVE_TAIL"]);
  const result=await run(archiveDirectory,checkpointDirectory,"promote");
  expect(result.ok).toBe(true);
  expect((await make().readCheckpoint()).count).toBe(1);
 }));
 it("checkpoint lock residue blocks a separate process",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));
  await mkdir(join(checkpointDirectory,"checkpoint.lock"));
  const result=await run(archiveDirectory,checkpointDirectory,"promote");
  expect(result).toMatchObject({ok:false,code:"XSUS_CHECKPOINT_LOCKED"});
  expect((await make().readCheckpoint()).count).toBe(0);
 }));
 it("pending checkpoint residue blocks a separate process with legacy EEXIST",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));
  await writeFile(join(checkpointDirectory,"checkpoint.pending"),"partial");
  const result=await run(archiveDirectory,checkpointDirectory,"promote");
  expect(result).toMatchObject({ok:false,code:"EEXIST"});
  expect((await make().readCheckpoint()).count).toBe(0);
 }));
 it("fresh subprocess verifies confirmed checkpoint and readiness",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));await r.promote();
  const cp=await run(archiveDirectory,checkpointDirectory,"checkpoint");
  const ready=await run(archiveDirectory,checkpointDirectory,"inspect");
  expect(cp).toMatchObject({ok:true,result:{count:1}});
  expect(ready).toMatchObject({ok:true,result:{safeToResume:true,blockers:[]}});
 }));
});

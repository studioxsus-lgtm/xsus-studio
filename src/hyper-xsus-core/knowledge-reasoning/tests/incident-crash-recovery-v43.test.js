import {describe,it,expect} from "vitest";
import {spawn} from "node:child_process";
import {mkdtemp,rm,readFile,writeFile,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
const helper=fileURLToPath(new URL("./helpers/incident-crash-child-v43.mjs",import.meta.url));
const clean={sequence:1,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]};
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-crash-v43-"));
 const archiveDirectory=join(root,"archive"),checkpointDirectory=join(root,"checkpoint");
 const make=()=>createIncidentRecoveryIntegration({
  archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
  checkpointKey:"b".repeat(48),archiveKeyId:"crash-archive",
  checkpointKeyId:"crash-checkpoint",authorize:async()=>true
 });
 try{await fn({make,archiveDirectory,checkpointDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
async function killWithLock(archiveDirectory,checkpointDirectory,mode){
 const child=spawn(process.execPath,[helper,archiveDirectory,checkpointDirectory,mode],{stdio:["ignore","pipe","pipe"]});
 let output="",stderr="";
 const completed=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{child.kill("SIGKILL");reject(new Error("Crash child readiness timeout: "+stderr));},10000);
  child.stdout.on("data",chunk=>{
   output+=chunk.toString();
   if(output.includes("LOCK_READY"))child.kill("SIGKILL");
  });
  child.stderr.on("data",chunk=>{stderr+=chunk.toString();});
  child.on("error",error=>{clearTimeout(timeout);reject(error);});
  child.on("exit",(code,signal)=>{
   clearTimeout(timeout);
   if(signal==="SIGKILL"&&output.includes("LOCK_READY"))resolve();
   else reject(new Error("Unexpected child termination "+code+"/"+signal+": "+stderr));
  });
 });
 await completed;
}
describe("Hyper Audit v4.3 — real process termination and recovery safety",()=>{
 it("SIGKILL leaves archive lock and blocks unsafe checkpoint promotion",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await killWithLock(archiveDirectory,checkpointDirectory,"archive");
  expect(await make().inspect()).toMatchObject({safeToResume:false,blockers:["WRITER_LOCK_REVIEW_REQUIRED","UNANCHORED_ARCHIVE_TAIL"]});
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BLOCKED"});
  expect(await make().readCheckpoint()).toMatchObject({count:0});
 }));
 it("SIGKILL leaves checkpoint lock and prevents checkpoint CAS",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await killWithLock(archiveDirectory,checkpointDirectory,"checkpoint");
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_LOCKED"});
  expect(await make().readCheckpoint()).toMatchObject({count:0});
 }));
 it("SIGKILL does not erase previously confirmed checkpoint",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  const anchored=await r.readCheckpoint();
  await killWithLock(archiveDirectory,checkpointDirectory,"archive");
  expect(await make().readCheckpoint()).toEqual(anchored);
  expect(await make().inspect()).toMatchObject({safeToResume:false,blockers:["WRITER_LOCK_REVIEW_REQUIRED"]});
 }));
 it("SIGKILL does not alter signed archive evidence",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  const before=await r.verifyArchive();
  await killWithLock(archiveDirectory,checkpointDirectory,"checkpoint");
  const after=await make().verifyArchive();
  expect(after).toEqual(before);
 }));
 it("archive lock residue remains across a new runtime",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await killWithLock(archiveDirectory,checkpointDirectory,"archive");
  await expect(stat(join(archiveDirectory,"writer.lock"))).resolves.toBeDefined();
  await expect(make().recordIncident({...clean,sequence:2})).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_CONFLICT"});
 }));
 it("checkpoint lock residue remains across a new runtime",async()=>fixture(async({make,archiveDirectory,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await killWithLock(archiveDirectory,checkpointDirectory,"checkpoint");
  await expect(stat(join(checkpointDirectory,"checkpoint.lock"))).resolves.toBeDefined();
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_LOCKED"});
 }));
 it("signed checkpoint tampering after restart remains detectable",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  const path=join(checkpointDirectory,"checkpoint.json");
  const body=JSON.parse(await readFile(path,"utf8"));body.count=100;
  await writeFile(path,JSON.stringify(body));
  await expect(make().readCheckpoint()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_SIGNATURE"});
 }));
});

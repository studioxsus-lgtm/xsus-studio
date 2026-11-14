import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,readFile,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
import {createDurableIncidentCheckpoint} from "../durable-incident-checkpoint.js";
const clean={sequence:1,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]};
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-transaction-v46-"));
 const archiveDirectory=join(root,"archive"),checkpointDirectory=join(root,"checkpoint");
 let authorize=async()=>true;
 const make=()=>createIncidentRecoveryIntegration({
  archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
  checkpointKey:"b".repeat(48),archiveKeyId:"transaction-archive",
  checkpointKeyId:"transaction-checkpoint",authorize:input=>authorize(input)
 });
 const checkpoint=()=>createDurableIncidentCheckpoint({
  directory:checkpointDirectory,key:"b".repeat(48),keyId:"transaction-checkpoint"
 });
 try{await fn({make,checkpoint,archiveDirectory,checkpointDirectory,setReviewer:fn=>{authorize=fn;}});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper Audit v4.6 — transaction integrity under interference",()=>{
 it("detects an archive append during reviewer authorization",async()=>fixture(async({make,setReviewer})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  setReviewer(async()=>{await make().recordIncident({...clean,sequence:2});return true;});
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_CHANGED"});
  expect((await r.readCheckpoint()).count).toBe(0);
  expect((await r.verifyArchive()).count).toBe(2);
 }));
 it("detects a competing legitimate promotion during reviewer authorization",async()=>fixture(async({make,setReviewer})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  let once=true;setReviewer(async()=>{
   if(once){once=false;await make().promote();}
   return true;
  });
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_READINESS_BLOCKED"});
  expect((await r.readCheckpoint()).count).toBe(1);
 }));
 it("rejects concurrent promotions on the same instance",async()=>fixture(async({make,setReviewer})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  let release;const gate=new Promise(resolve=>{release=resolve;});
  let entered;const ready=new Promise(resolve=>{entered=resolve;});
  setReviewer(async()=>{entered();await gate;return true;});
  const first=r.promote();await ready;
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BUSY"});
  release();await expect(first).resolves.toMatchObject({status:"promoted"});
 }));
 it("CAS rejects stale checkpoint snapshots",async()=>fixture(async({make,checkpoint})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  const cp=checkpoint();
  await expect(cp.advance({count:0,tip:"0".repeat(64)},{count:2,tip:"1".repeat(64)}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_CAS_CONFLICT"});
  expect((await cp.read()).count).toBe(1);
 }));
 it("checkpoint lock prevents concurrent CAS without mutation",async()=>fixture(async({make,checkpoint,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();
  await mkdir(join(checkpointDirectory,"checkpoint.lock"));
  await expect(checkpoint().advance({count:0,tip:"0".repeat(64)},{count:1,tip:"1".repeat(64)}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_LOCKED"});
  expect((await r.readCheckpoint()).count).toBe(0);
 }));
 it("pending file blocks promotion before reviewer is called",async()=>fixture(async({make,checkpointDirectory,setReviewer})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  let calls=0;setReviewer(async()=>{calls++;return true;});
  await writeFile(join(checkpointDirectory,"checkpoint.pending"),"partial");
  await expect(r.promote()).rejects.toMatchObject({code:"EEXIST"});
  expect(calls).toBe(0);
  expect((await r.readCheckpoint()).count).toBe(0);
 }));
 it("archive evidence tampering during review is detected",async()=>fixture(async({make,archiveDirectory,setReviewer})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  setReviewer(async()=>{
   const path=join(archiveDirectory,"incident-0000000000000001.json");
   const record=JSON.parse(await readFile(path,"utf8"));
   record.report.sequence=100;
   await writeFile(path,JSON.stringify(record));
   return true;
  });
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_SIGNATURE"});
  expect((await r.readCheckpoint()).count).toBe(0);
 }));
 it("archive rollback during review prevents checkpoint advancement",async()=>fixture(async({make,archiveDirectory,setReviewer})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  setReviewer(async()=>{await unlink(join(archiveDirectory,"incident-0000000000000001.json"));return true;});
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_READINESS_BLOCKED"});
  expect((await r.readCheckpoint()).count).toBe(0);
 }));
 it("checkpoint signature corruption during review prevents promotion",async()=>fixture(async({make,checkpointDirectory,setReviewer})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  setReviewer(async()=>{
   const path=join(checkpointDirectory,"checkpoint.json");
   const body=JSON.parse(await readFile(path,"utf8"));body.count=99;
   await writeFile(path,JSON.stringify(body));return true;
  });
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_SIGNATURE"});
 }));
 it("sequential promotions retain monotonic signed checkpoints",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  let previous=0;
  for(let i=1;i<=8;i++){
   await make().recordIncident({...clean,sequence:i});
   await make().promote();
   const state=await make().readCheckpoint();
   expect(state.count).toBe(i);expect(state.count).toBeGreaterThan(previous);
   previous=state.count;
   expect((await make().inspectReadiness()).safeToResume).toBe(true);
  }
 }));
});

import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,readFile,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";

const clean={sequence:1,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]};
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-recovery-stress-v42-"));
 const archiveDirectory=join(root,"archive"),checkpointDirectory=join(root,"checkpoint");
 let authorized=true;
 const make=()=>createIncidentRecoveryIntegration({
  archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
  checkpointKey:"b".repeat(48),archiveKeyId:"stress-archive",checkpointKeyId:"stress-checkpoint",
  authorize:async()=>authorized
 });
 try{await fn({make,archiveDirectory,checkpointDirectory,approve:v=>{authorized=v;}});}
 finally{await rm(root,{recursive:true,force:true});}
}
const filename=n=>`incident-${String(n).padStart(16,"0")}.json`;

describe("Hyper Audit v4.2 — durability, fault injection and stress",()=>{
 it("performs 1000 authenticated operations with stable checkpoint after restart",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  for(let i=1;i<=40;i++)await r.recordIncident({...clean,sequence:i});
  await r.promote();
  let verified=0;
  for(let i=0;i<960;i++){
   const checkpoint=await make().readCheckpoint();
   expect(checkpoint.count).toBe(40);
   if(i%80===0){
    const state=await make().inspect();
    expect(state).toMatchObject({safeToResume:true,archiveCount:40,trustedCount:40});
    verified++;
   }
  }
  expect(verified).toBe(12);
  expect(await make().verifyArchive()).toMatchObject({count:40});
 }));
 it("survives 10 independent restart and review cycles",async()=>fixture(async({make})=>{
  await make().initializeCheckpoint();
  for(let i=1;i<=10;i++){
   const r=make();await r.recordIncident({...clean,sequence:i});
   expect((await make().inspect()).blockers).toEqual(["UNANCHORED_ARCHIVE_TAIL"]);
   await make().promote();
   expect(await make().readCheckpoint()).toMatchObject({count:i});
  }
  expect(await make().inspect()).toMatchObject({safeToResume:true,archiveCount:10});
 }));
 it("rejects unreviewed tail across restart",async()=>fixture(async({make,approve})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  approve(false);
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_DENIED"});
  expect(await make().readCheckpoint()).toMatchObject({count:0});
  expect(await make().inspect()).toMatchObject({blockers:["UNANCHORED_ARCHIVE_TAIL"]});
 }));
 it("rejects concurrent append attempts without losing successful evidence",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  const outcomes=await Promise.allSettled(Array.from({length:12},(_,i)=>make().recordIncident({...clean,sequence:i+1})));
  const successful=outcomes.filter(x=>x.status==="fulfilled").length;
  const verified=await make().verifyArchive();
  expect(successful).toBeGreaterThanOrEqual(1);
  expect(verified.count).toBe(successful);
  await make().promote();
  expect(await make().readCheckpoint()).toMatchObject({count:successful});
 }));
 it("fails closed on interrupted archive writer lock",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await mkdir(join(archiveDirectory,"writer.lock"));
  expect(await make().inspect()).toMatchObject({safeToResume:false,blockers:["WRITER_LOCK_REVIEW_REQUIRED","UNANCHORED_ARCHIVE_TAIL"]});
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BLOCKED"});
 }));
 it("fails closed on interrupted checkpoint writer lock",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await mkdir(join(checkpointDirectory,"checkpoint.lock"));
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_LOCKED"});
  expect(await make().readCheckpoint()).toMatchObject({count:0});
 }));
 it("fails closed on pending checkpoint write residue",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await writeFile(join(checkpointDirectory,"checkpoint.pending"),"partial");
  await expect(make().promote()).rejects.toMatchObject({code:"EEXIST"});
  expect(await make().readCheckpoint()).toMatchObject({count:0});
 }));
 it("detects corruption of signed incident evidence after checkpoint promotion",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  const p=join(archiveDirectory,filename(1));
  const record=JSON.parse(await readFile(p,"utf8"));
  record.report.sequence=999;await writeFile(p,JSON.stringify(record));
  await expect(make().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_SIGNATURE"});
 }));
 it("detects truncation of authenticated archive after checkpoint promotion",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  await unlink(join(archiveDirectory,filename(1)));
  expect(await make().inspect()).toMatchObject({blockers:["ARCHIVE_ROLLBACK"]});
 }));
 it("detects tampered durable checkpoint after restart",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  const p=join(checkpointDirectory,"checkpoint.json");
  const data=JSON.parse(await readFile(p,"utf8"));data.count=5;
  await writeFile(p,JSON.stringify(data));
  await expect(make().readCheckpoint()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_SIGNATURE"});
 }));
 it("preserves anchored prefix while refusing a new unreviewed batch",async()=>fixture(async({make,approve})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  await make().recordIncident({...clean,sequence:2});approve(false);
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_DENIED"});
  expect(await make().readCheckpoint()).toMatchObject({count:1});
  expect(await make().inspect()).toMatchObject({blockers:["UNANCHORED_ARCHIVE_TAIL"]});
 }));
 it("detects missing middle record after signed batch",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();
  for(let i=1;i<=3;i++)await r.recordIncident({...clean,sequence:i});
  await r.promote();await unlink(join(archiveDirectory,filename(2)));
  await expect(make().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_GAP"});
 }));
 it("never automatically creates missing trusted checkpoint",async()=>fixture(async({make})=>{
  await make().recordIncident(clean);
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_UNINITIALIZED"});
 }));
});

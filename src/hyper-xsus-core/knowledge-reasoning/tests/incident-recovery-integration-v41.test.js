import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,unlink,readFile,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
const clean={sequence:1,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]};
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-integration-v41-"));
 const archiveDirectory=join(root,"archive"),checkpointDirectory=join(root,"checkpoint");
 let allowed=true;
 const make=(opts={})=>createIncidentRecoveryIntegration({
  archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
  checkpointKey:"b".repeat(48),archiveKeyId:"archive-v41",checkpointKeyId:"checkpoint-v41",
  authorize:async()=>allowed,...opts
 });
 try{await fn({make,archiveDirectory,checkpointDirectory,approve:x=>{allowed=x;}});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper Audit v4.1 — integrated durable incident recovery",()=>{
 it("initializes checkpoint and accepts empty archive",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  expect(await r.inspect()).toMatchObject({status:"consistent",archiveCount:0,trustedCount:0});
 }));
 it("records then promotes explicitly authorized evidence",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  expect(await r.inspect()).toMatchObject({safeToResume:false,blockers:["UNANCHORED_ARCHIVE_TAIL"]});
  expect(await r.promote()).toMatchObject({status:"promoted",next:{count:1}});
  expect(await r.inspect()).toMatchObject({safeToResume:true,archiveCount:1,trustedCount:1});
 }));
 it("persists checkpoint and archive across runtime recreation",async()=>fixture(async({make})=>{
  const a=make();await a.initializeCheckpoint();await a.recordIncident(clean);await a.promote();
  const b=make();expect(await b.readCheckpoint()).toMatchObject({count:1});
  expect(await b.inspect()).toMatchObject({safeToResume:true});
 }));
 it("rejects unauthorized promotion without state mutation",async()=>fixture(async({make,approve})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);approve(false);
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_DENIED"});
  expect(await r.readCheckpoint()).toMatchObject({count:0});
 }));
 it("rejects repeat promotion without new evidence",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BLOCKED"});
 }));
 it("promotes two separately reviewed batches",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  await r.recordIncident({...clean,sequence:2});await r.promote();
  expect(await r.readCheckpoint()).toMatchObject({count:2});
 }));
 it("blocks promotion while writer lock remains",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await mkdir(join(archiveDirectory,"writer.lock"));
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BLOCKED"});
 }));
 it("detects archive rollback after promotion",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  await unlink(join(archiveDirectory,"incident-0000000000000001.json"));
  expect(await r.inspect()).toMatchObject({blockers:["ARCHIVE_ROLLBACK"]});
 }));
 it("detects archive corruption after promotion",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  await writeFile(join(archiveDirectory,"incident-0000000000000001.json"),"{");
  await expect(r.inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_INVALID"});
 }));
 it("detects checkpoint corruption",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();
  await writeFile(join(checkpointDirectory,"checkpoint.json"),"{");
  await expect(r.inspect()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_CORRUPT"});
 }));
 it("fails closed on orphaned checkpoint lock",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await mkdir(join(checkpointDirectory,"checkpoint.lock"));
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_LOCKED"});
 }));
 it("rejects missing initialization",async()=>fixture(async({make})=>{
  await expect(make().inspect()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_UNINITIALIZED"});
 }));
 it("rejects shared archive/checkpoint directory",async()=>fixture(async({make,archiveDirectory})=>{
  expect(()=>make({checkpointDirectory:archiveDirectory})).toThrow(TypeError);
 }));
 it("returns frozen integration facade",async()=>fixture(async({make})=>{
  expect(Object.isFrozen(make())).toBe(true);
 }));
 it("supports 12 reviewed, durable batches",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  for(let i=1;i<=12;i++){
   await r.recordIncident({...clean,sequence:i});await r.promote();
  }
  expect(await make().inspect()).toMatchObject({safeToResume:true,archiveCount:12,trustedCount:12});
 }));
});

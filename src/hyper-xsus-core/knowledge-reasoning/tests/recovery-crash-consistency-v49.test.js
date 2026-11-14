import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,mkdir,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
const report=n=>({sequence:n,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]});
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-crash-consistency-v49-"));
 const archiveDirectory=join(root,"archive"),checkpointDirectory=join(root,"checkpoint");
 const make=()=>createIncidentRecoveryIntegration({
  archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
  checkpointKey:"b".repeat(48),archiveKeyId:"consistency-archive",
  checkpointKeyId:"consistency-checkpoint",authorize:async()=>true
 });
 try{await fn({make,archiveDirectory,checkpointDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
const evidence=(dir,n)=>join(dir,`incident-${String(n).padStart(16,"0")}.json`);
describe("Hyper Audit v4.9 — persisted crash-state consistency",()=>{
 it("an interrupted checkpoint pending write cannot advance a trusted mark",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));
  await writeFile(join(checkpointDirectory,"checkpoint.pending"),'{"count":1');
  await expect(make().promote()).rejects.toMatchObject({code:"EEXIST"});
  expect((await make().readCheckpoint()).count).toBe(0);
  expect((await make().inspectReadiness()).safeToResume).toBe(false);
 }));
 it("an orphaned checkpoint lock plus pending file remains blocked across new instances",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));
  await mkdir(join(checkpointDirectory,"checkpoint.lock"));
  await writeFile(join(checkpointDirectory,"checkpoint.pending"),"partial");
  await expect(make().promote()).rejects.toMatchObject({code:"EEXIST"});
  const readiness=await make().inspectReadiness();
  expect(readiness.blockers).toContain("CHECKPOINT_PENDING_REVIEW_REQUIRED");
  expect(readiness.blockers).toContain("CHECKPOINT_WRITER_LOCK_REVIEW_REQUIRED");
  expect((await make().readCheckpoint()).count).toBe(0);
 }));
 it("a truncated authenticated checkpoint is never silently reinitialized",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();
  await writeFile(join(checkpointDirectory,"checkpoint.json"),'{"version":');
  await expect(make().readCheckpoint()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_CORRUPT"});
  await expect(make().initializeCheckpoint()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_CORRUPT"});
 }));
 it("a truncated archive record is detected before promotion",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));
  await writeFile(evidence(archiveDirectory,1),'{"sequence":1');
  await expect(make().verifyArchive()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_INVALID"});
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_INVALID"});
  expect((await make().readCheckpoint()).count).toBe(0);
 }));
 it("a truncated unanchored second record does not overwrite trusted checkpoint",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));await r.promote();
  const before=await r.readCheckpoint();
  await r.recordIncident(report(2));
  await writeFile(evidence(archiveDirectory,2),'{"report":');
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_INVALID"});
  expect(await make().readCheckpoint()).toEqual(before);
 }));
 it("corrupted signed checkpoint is rejected even with a complete pending replacement",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));
  const path=join(checkpointDirectory,"checkpoint.json");
  const original=await readFile(path,"utf8");
  await writeFile(join(checkpointDirectory,"checkpoint.pending"),original);
  const data=JSON.parse(original);data.count=100;
  await writeFile(path,JSON.stringify(data));
  await expect(make().readCheckpoint()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_SIGNATURE"});
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_SIGNATURE"});
  expect((await stat(join(checkpointDirectory,"checkpoint.pending"))).isFile()).toBe(true);
 }));
 it("an existing checkpoint pending file is not automatically deleted",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();
  const pending=join(checkpointDirectory,"checkpoint.pending");
  await writeFile(pending,"operator-review-required");
  await expect(make().initializeCheckpoint()).resolves.toBe(false);
  expect(await readFile(pending,"utf8")).toBe("operator-review-required");
  expect((await make().inspectReadiness()).safeToResume).toBe(false);
 }));
 it("an orphaned archive lock prevents new evidence and promotion",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));
  await mkdir(join(archiveDirectory,"writer.lock"));
  await expect(make().recordIncident(report(2))).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_CONFLICT"});
  await expect(make().promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BLOCKED"});
  expect((await make().verifyArchive()).count).toBe(1);
  expect((await make().readCheckpoint()).count).toBe(0);
 }));
});

import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
import {createRecoveryOperationalReport} from "../recovery-operational-report.js";
const clean={sequence:1,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]};
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-operational-v50-"));
 const archiveDirectory=join(root,"archive"),checkpointDirectory=join(root,"checkpoint");
 const make=()=>createIncidentRecoveryIntegration({
  archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
  checkpointKey:"b".repeat(48),archiveKeyId:"operational-archive",
  checkpointKeyId:"operational-checkpoint",authorize:async()=>true
 });
 try{await fn({make,archiveDirectory,checkpointDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper Audit v5.0 — operational recovery readiness",()=>{
 it("reports a clean initialized checkpoint as ready",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  await expect(r.inspectOperationalReadiness()).resolves.toMatchObject({
   version:"5.0.0",status:"ready",safeToResume:true,blockers:[],
   archive:{count:0},checkpoint:{count:0}
  });
 }));
 it("reports an unanchored signed tail without promoting it",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  const result=await r.inspectOperationalReadiness();
  expect(result).toMatchObject({status:"manual-intervention-required",safeToResume:false,archive:{count:1},checkpoint:{count:0}});
  expect(result.blockers).toContain("UNANCHORED_ARCHIVE_TAIL");
  expect((await r.readCheckpoint()).count).toBe(0);
 }));
 it("reports ready after explicitly authorized promotion",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  await expect(make().inspectOperationalReadiness()).resolves.toMatchObject({
   status:"ready",safeToResume:true,archive:{count:1},checkpoint:{count:1}
  });
 }));
 it("reports checkpoint pending residue as unsafe",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();
  await writeFile(join(checkpointDirectory,"checkpoint.pending"),"partial");
  const state=await make().inspectOperationalReadiness();
  expect(state.safeToResume).toBe(false);
  expect(state.blockers).toContain("CHECKPOINT_PENDING_REVIEW_REQUIRED");
 }));
 it("reports archive writer lock as unsafe",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();
  await mkdir(archiveDirectory,{recursive:true});
  await mkdir(join(archiveDirectory,"writer.lock"));
  const state=await make().inspectOperationalReadiness();
  expect(state.safeToResume).toBe(false);
  expect(state.blockers).toContain("ARCHIVE_WRITER_LOCK_REVIEW_REQUIRED");
 }));
 it("does not conceal checkpoint signature corruption",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();
  const path=join(checkpointDirectory,"checkpoint.json");
  const data=JSON.parse(await readFile(path,"utf8"));data.count=10;
  await writeFile(path,JSON.stringify(data));
  await expect(make().inspectOperationalReadiness()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_SIGNATURE"});
 }));
 it("detects a storage change between readiness and final validation",async()=>{
  let calls=0;
  const report=createRecoveryOperationalReport({
   inspectReadiness:async()=>{calls++;return {
    safeToResume:true,blockers:[],
    core:{archiveCount:calls===1?0:1,archiveTip:"0".repeat(64),trustedCount:0,trustedTip:"0".repeat(64)}
   };},
   verifyArchive:async()=>({count:0,tip:"0".repeat(64),entries:[]}),
   readCheckpoint:async()=>({count:0,tip:"0".repeat(64)})
  });
  await expect(report.assess()).rejects.toMatchObject({code:"XSUS_RECOVERY_OPERATIONAL_CHANGED"});
 });
 it("rejects malformed readiness results",async()=>{
  const report=createRecoveryOperationalReport({
   inspectReadiness:async()=>({safeToResume:true,blockers:"invalid"}),
   verifyArchive:async()=>({count:0,tip:"0".repeat(64),entries:[]}),
   readCheckpoint:async()=>({count:0,tip:"0".repeat(64)})
  });
  await expect(report.assess()).rejects.toMatchObject({code:"XSUS_RECOVERY_OPERATIONAL_INVALID"});
 });
 it("returns frozen report and does not mutate checkpoint",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  const before=await r.readCheckpoint();
  const result=await r.inspectOperationalReadiness();
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.blockers)).toBe(true);
  expect(Object.isFrozen(result.archive)).toBe(true);
  expect(await r.readCheckpoint()).toEqual(before);
 }));
});

import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";

const report=sequence=>({sequence,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]});
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-operational-stress-v52-"));
 const archiveDirectory=join(root,"archive"),checkpointDirectory=join(root,"checkpoint");
 const make=()=>createIncidentRecoveryIntegration({
  archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
  checkpointKey:"b".repeat(48),archiveKeyId:"stress-archive",
  checkpointKeyId:"stress-checkpoint",authorize:async()=>true
 });
 try{await fn({make,archiveDirectory,checkpointDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper Audit v5.2 — operational reliability stress",()=>{
 it("100 sequential reports preserve an empty trusted checkpoint",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  const before=await r.readCheckpoint();
  for(let i=0;i<100;i++){
   const state=await r.inspectOperationalReadiness();
   expect(state).toMatchObject({status:"ready",safeToResume:true,archive:{count:0},checkpoint:{count:0}});
  }
  expect(await r.readCheckpoint()).toEqual(before);
 }));
 it("50 parallel reports from independent instances remain consistent",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  const results=await Promise.all(Array.from({length:50},()=>make().inspectOperationalReadiness()));
  expect(results).toHaveLength(50);
  expect(results.every(x=>x.safeToResume&&x.status==="ready"&&x.archive.count===0&&x.checkpoint.count===0)).toBe(true);
  expect((await make().readCheckpoint()).count).toBe(0);
 }));
 it("30 authenticated evidence records remain unanchored under repeated reporting",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  for(let i=1;i<=30;i++)await r.recordIncident(report(i));
  for(let i=0;i<15;i++){
   const state=await make().inspectOperationalReadiness();
   expect(state.safeToResume).toBe(false);
   expect(state.blockers).toContain("UNANCHORED_ARCHIVE_TAIL");
   expect(state.archive.count).toBe(30);
   expect(state.checkpoint.count).toBe(0);
  }
  expect((await r.verifyArchive()).count).toBe(30);
  expect((await r.readCheckpoint()).count).toBe(0);
 }));
 it("parallel reports preserve a manually blocked checkpoint pending artifact",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();
  const pending=join(checkpointDirectory,"checkpoint.pending");
  await writeFile(pending,"manual-review");
  const results=await Promise.all(Array.from({length:20},()=>make().inspectOperationalReadiness()));
  expect(results.every(x=>!x.safeToResume&&x.blockers.includes("CHECKPOINT_PENDING_REVIEW_REQUIRED"))).toBe(true);
  expect(await readFile(pending,"utf8")).toBe("manual-review");
 }));
 it("parallel reports preserve an orphaned archive writer lock",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();
  await mkdir(archiveDirectory,{recursive:true});
  await mkdir(join(archiveDirectory,"writer.lock"));
  const results=await Promise.all(Array.from({length:20},()=>make().inspectOperationalReadiness()));
  expect(results.every(x=>!x.safeToResume&&x.blockers.includes("ARCHIVE_WRITER_LOCK_REVIEW_REQUIRED"))).toBe(true);
  expect((await r.readCheckpoint()).count).toBe(0);
 }));
 it("repeated reports remain ready after an explicitly authorized promotion",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(report(1));await r.promote();
  const before=await r.readCheckpoint();
  for(let i=0;i<25;i++){
   const state=await make().inspectOperationalReadiness();
   expect(state).toMatchObject({status:"ready",safeToResume:true,archive:{count:1},checkpoint:{count:1}});
  }
  expect(await r.readCheckpoint()).toEqual(before);
 }));
});

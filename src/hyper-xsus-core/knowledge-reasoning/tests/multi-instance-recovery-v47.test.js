import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
const report=n=>({sequence:n,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]});
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-multi-instance-v47-"));
 const archiveDirectory=join(root,"archive"),checkpointDirectory=join(root,"checkpoint");
 const make=(authorize=async()=>true)=>createIncidentRecoveryIntegration({
  archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
  checkpointKey:"b".repeat(48),archiveKeyId:"multi-archive",
  checkpointKeyId:"multi-checkpoint",authorize
 });
 try{await fn({make,archiveDirectory,checkpointDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper Audit v4.7 — multi-instance recovery concurrency",()=>{
 it("two independent instances cannot both promote the same tail",async()=>fixture(async({make})=>{
  const a=make(),b=make();
  await a.initializeCheckpoint();await a.recordIncident(report(1));
  const outcomes=await Promise.allSettled([a.promote(),b.promote()]);
  expect(outcomes.filter(x=>x.status==="fulfilled")).toHaveLength(1);
  expect(outcomes.filter(x=>x.status==="rejected")).toHaveLength(1);
  expect((await make().readCheckpoint()).count).toBe(1);
  expect((await make().inspectReadiness()).safeToResume).toBe(true);
 }));
 it("a competing instance cannot promote while a reviewer is paused without conflict",async()=>fixture(async({make})=>{
  let entered;const reviewerEntered=new Promise(resolve=>{entered=resolve;});
  let release;const reviewerRelease=new Promise(resolve=>{release=resolve;});
  const a=make(async()=>{entered();await reviewerRelease;return true;});
  const b=make();
  await a.initializeCheckpoint();await a.recordIncident(report(1));
  const pending=a.promote();await reviewerEntered;
  await expect(b.promote()).resolves.toMatchObject({status:"promoted"});
  release();
  await expect(pending).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BLOCKED"});
  expect((await make().readCheckpoint()).count).toBe(1);
 }));
 it("two instances serialize concurrent archive append attempts",async()=>fixture(async({make})=>{
  const a=make(),b=make();await a.initializeCheckpoint();
  const results=await Promise.allSettled([a.recordIncident(report(1)),b.recordIncident(report(2))]);
  const successes=results.filter(x=>x.status==="fulfilled").length;
  const archive=await make().verifyArchive();
  expect(successes).toBeGreaterThanOrEqual(1);
  expect(archive.count).toBe(successes);
  expect(archive.entries.map(e=>e.sequence)).toEqual(Array.from({length:successes},(_,i)=>i+1));
 }));
 it("a pending checkpoint artifact blocks every instance consistently",async()=>fixture(async({make,checkpointDirectory})=>{
  const a=make(),b=make();await a.initializeCheckpoint();await a.recordIncident(report(1));
  await writeFile(join(checkpointDirectory,"checkpoint.pending"),"partial");
  const outcomes=await Promise.allSettled([a.promote(),b.promote()]);
  expect(outcomes).toHaveLength(2);
  for(const outcome of outcomes){
   expect(outcome.status).toBe("rejected");
   expect(outcome.reason).toMatchObject({code:"EEXIST"});
  }
  expect((await make().readCheckpoint()).count).toBe(0);
 }));
 it("an orphaned checkpoint lock blocks both instances",async()=>fixture(async({make,checkpointDirectory})=>{
  const a=make(),b=make();await a.initializeCheckpoint();await a.recordIncident(report(1));
  await mkdir(join(checkpointDirectory,"checkpoint.lock"));
  const outcomes=await Promise.allSettled([a.promote(),b.promote()]);
  for(const outcome of outcomes){
   expect(outcome.status).toBe("rejected");
   expect(outcome.reason).toMatchObject({code:"XSUS_CHECKPOINT_LOCKED"});
  }
  expect((await make().readCheckpoint()).count).toBe(0);
 }));
 it("independent instances observe the same verified checkpoint after restart",async()=>fixture(async({make})=>{
  const a=make();await a.initializeCheckpoint();
  for(let i=1;i<=5;i++){
   await a.recordIncident(report(i));
   await make().promote();
  }
  const results=await Promise.all([make().readCheckpoint(),make().readCheckpoint(),make().readCheckpoint()]);
  expect(results.every(x=>x.count===5&&x.tip===results[0].tip)).toBe(true);
  expect((await make().inspectReadiness()).safeToResume).toBe(true);
 }));
});

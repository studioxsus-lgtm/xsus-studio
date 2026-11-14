import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createRecoveryDecisionVerification} from "../recovery-decision-verification.js";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
const tip="a".repeat(64);
const ready=()=>({status:"ready",safeToResume:true,blockers:[],archive:{count:0,tip},checkpoint:{count:0,tip}});
const blocked=(...blockers)=>({...ready(),status:"manual-intervention-required",safeToResume:false,blockers});
const engine=reader=>createRecoveryDecisionVerification({inspectOperationalReadiness:reader});
describe("Hyper Audit v5.5 — verified recovery decisions",()=>{
 it("verifies stable ready snapshots",async()=>{
  const result=await engine(async()=>ready()).assess();
  expect(result).toMatchObject({version:"5.5.0",verified:true,safeToResume:true,recommendedActions:[]});
 });
 it("verifies stable blocked snapshots and keeps human approval",async()=>{
  const result=await engine(async()=>blocked("CHECKPOINT_PENDING_REVIEW_REQUIRED")).assess();
  expect(result).toMatchObject({verified:true,safeToResume:false,requiresManualReview:true});
  expect(result.recommendedActions[0]).toMatchObject({action:"REVIEW_INCOMPLETE_WRITE",requiresHumanApproval:true});
 });
 it("rejects changed archive tip",async()=>{
  let n=0;
  await expect(engine(async()=>({...ready(),archive:{count:0,tip:++n===1?tip:"b".repeat(64)}})).assess())
   .rejects.toMatchObject({code:"XSUS_RECOVERY_DECISION_STALE"});
 });
 it("rejects changed checkpoint count",async()=>{
  let n=0;
  await expect(engine(async()=>({...ready(),checkpoint:{count:++n===1?0:1,tip}})).assess())
   .rejects.toMatchObject({code:"XSUS_RECOVERY_DECISION_STALE"});
 });
 it("rejects changing blockers",async()=>{
  let n=0;
  await expect(engine(async()=>++n===1?blocked("ARCHIVE_WRITER_LOCK_REVIEW_REQUIRED"):blocked("CHECKPOINT_PENDING_REVIEW_REQUIRED")).assess())
   .rejects.toMatchObject({code:"XSUS_RECOVERY_DECISION_STALE"});
 });
 it("rejects a transition from ready to blocked",async()=>{
  let n=0;
  await expect(engine(async()=>++n===1?ready():blocked("UNANCHORED_ARCHIVE_TAIL")).assess())
   .rejects.toMatchObject({code:"XSUS_RECOVERY_DECISION_STALE"});
 });
 it("accepts blocker reordering without weakening review",async()=>{
  let n=0;const codes=["ARCHIVE_WRITER_LOCK_REVIEW_REQUIRED","CHECKPOINT_PENDING_REVIEW_REQUIRED"];
  const result=await engine(async()=>blocked(...(++n===1?codes:[...codes].reverse()))).assess();
  expect(result.recommendedActions).toHaveLength(2);
  expect(result.safeToResume).toBe(false);
 });
 it("rejects malformed authenticated snapshots",async()=>{
  await expect(engine(async()=>({...ready(),archive:{count:-1,tip}})).assess())
   .rejects.toMatchObject({code:"XSUS_RECOVERY_DECISION_VERIFY_INVALID"});
 });
 it("propagates reader failures",async()=>{
  const error=new Error("storage failure");
  await expect(engine(async()=>{throw error;}).assess()).rejects.toBe(error);
 });
 it("freezes verified output and snapshot",async()=>{
  const result=await engine(async()=>ready()).assess();
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.snapshot)).toBe(true);
  expect(Object.isFrozen(result.snapshot.archive)).toBe(true);
 });
 it("verifies real integration without changing pending artifacts",async()=>{
  const root=await mkdtemp(join(tmpdir(),"xsus-verification-v55-"));
  try{
   const r=createIncidentRecoveryIntegration({
    archiveDirectory:join(root,"archive"),checkpointDirectory:join(root,"checkpoint"),
    archiveKey:"a".repeat(48),checkpointKey:"b".repeat(48),
    archiveKeyId:"verification-archive",checkpointKeyId:"verification-checkpoint",
    authorize:async()=>true
   });
   await r.initializeCheckpoint();
   const before=await r.readCheckpoint();
   expect(await r.verifyRecoveryDecisions()).toMatchObject({verified:true,safeToResume:true});
   const pending=join(root,"checkpoint","checkpoint.pending");
   await writeFile(pending,"manual-review");
   const result=await r.verifyRecoveryDecisions();
   expect(result).toMatchObject({verified:true,safeToResume:false});
   expect(await readFile(pending,"utf8")).toBe("manual-review");
   expect(await r.readCheckpoint()).toEqual(before);
  }finally{await rm(root,{recursive:true,force:true});}
 });
});

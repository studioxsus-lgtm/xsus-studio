import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {decideRecoveryActions,createRecoveryDecisionIntelligence} from "../recovery-decision-intelligence.js";
import {classifyRecoveryOperationalReport} from "../recovery-diagnostics.js";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
const blocked=(...blockers)=>classifyRecoveryOperationalReport({status:"manual-intervention-required",safeToResume:false,blockers});
describe("Hyper Audit v5.4 — advisory recovery decisions",()=>{
 it("returns no recommendations for a ready system",()=>{
  const result=decideRecoveryActions(classifyRecoveryOperationalReport({status:"ready",safeToResume:true,blockers:[]}));
  expect(result).toMatchObject({version:"5.4.0",status:"ready",safeToResume:true,requiresManualReview:false,recommendedActions:[]});
 });
 it("prioritizes critical signed evidence verification",()=>{
  const result=decideRecoveryActions(blocked("UNANCHORED_ARCHIVE_TAIL","ARCHIVE_ROLLBACK"));
  expect(result.recommendedActions.map(x=>x.action)).toEqual(["VERIFY_SIGNED_EVIDENCE_AND_ESCALATE","REVIEW_UNANCHORED_EVIDENCE"]);
  expect(result.recommendedActions[0].priority).toBe("critical");
 });
 it("recommends human review for unanchored evidence",()=>{
  expect(decideRecoveryActions(blocked("UNANCHORED_ARCHIVE_TAIL")).recommendedActions[0])
   .toMatchObject({action:"REVIEW_UNANCHORED_EVIDENCE",requiresHumanApproval:true});
 });
 it("recommends lock investigation without removing it",()=>{
  expect(decideRecoveryActions(blocked("ARCHIVE_WRITER_LOCK_REVIEW_REQUIRED")).recommendedActions[0].action).toBe("INVESTIGATE_WRITER_LOCK");
 });
 it("recommends incomplete write review",()=>{
  expect(decideRecoveryActions(blocked("CHECKPOINT_PENDING_REVIEW_REQUIRED")).recommendedActions[0].action).toBe("REVIEW_INCOMPLETE_WRITE");
 });
 it("escalates unknown blockers",()=>{
  expect(decideRecoveryActions(blocked("FUTURE_BLOCKER")).recommendedActions[0].action).toBe("ESCALATE_UNKNOWN_BLOCKER");
 });
 it("uses deterministic ordering for equal priorities",()=>{
  const a=decideRecoveryActions(blocked("Z_UNKNOWN","A_UNKNOWN"));
  expect(a.recommendedActions.map(x=>x.incidentCode)).toEqual(["A_UNKNOWN","Z_UNKNOWN"]);
 });
 it("rejects malformed or contradictory diagnostic reports",()=>{
  const valid=blocked("FUTURE_BLOCKER");
  for(const value of [null,{}, {...valid,safeToResume:true},{...valid,incidents:[null]},
   {...valid,incidents:[valid.incidents[0],valid.incidents[0]]}])
   expect(()=>decideRecoveryActions(value)).toThrow();
 });
 it("returns frozen decisions and recommendations",()=>{
  const result=decideRecoveryActions(blocked("ARCHIVE_ROLLBACK"));
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.recommendedActions)).toBe(true);
  expect(Object.isFrozen(result.recommendedActions[0])).toBe(true);
 });
 it("propagates diagnostic reader failures",async()=>{
  const error=new Error("unavailable");
  const engine=createRecoveryDecisionIntelligence({inspectRecoveryDiagnostics:async()=>{throw error;}});
  await expect(engine.assess()).rejects.toBe(error);
 });
 it("integrates read-only decisions without changing checkpoint or pending file",async()=>{
  const root=await mkdtemp(join(tmpdir(),"xsus-decisions-v54-"));
  try{
   const r=createIncidentRecoveryIntegration({
    archiveDirectory:join(root,"archive"),checkpointDirectory:join(root,"checkpoint"),
    archiveKey:"a".repeat(48),checkpointKey:"b".repeat(48),
    archiveKeyId:"decisions-archive",checkpointKeyId:"decisions-checkpoint",
    authorize:async()=>true
   });
   await r.initializeCheckpoint();
   const before=await r.readCheckpoint();
   expect(await r.inspectRecoveryDecisions()).toMatchObject({status:"ready",recommendedActions:[]});
   await writeFile(join(root,"checkpoint","checkpoint.pending"),"partial");
   const decision=await r.inspectRecoveryDecisions();
   expect(decision).toMatchObject({safeToResume:false,requiresManualReview:true});
   expect(decision.recommendedActions.some(x=>x.action==="REVIEW_INCOMPLETE_WRITE")).toBe(true);
   expect(await r.readCheckpoint()).toEqual(before);
  }finally{await rm(root,{recursive:true,force:true});}
 });
});

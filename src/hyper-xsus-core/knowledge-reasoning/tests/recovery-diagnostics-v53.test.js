import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {classifyRecoveryOperationalReport,createRecoveryDiagnostics} from "../recovery-diagnostics.js";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
const ready={status:"ready",safeToResume:true,blockers:[]};
const blocked=(...blockers)=>({status:"manual-intervention-required",safeToResume:false,blockers});
describe("Hyper Audit v5.3 — recovery incident diagnostics",()=>{
 it("classifies a ready report with no incidents",()=>{
  expect(classifyRecoveryOperationalReport(ready)).toMatchObject({
   version:"5.3.0",status:"ready",severity:"none",incidents:[],requiresManualReview:false
  });
 });
 it("classifies archive rollback as critical integrity incident",()=>{
  expect(classifyRecoveryOperationalReport(blocked("ARCHIVE_ROLLBACK")).incidents[0])
   .toMatchObject({category:"integrity",severity:"critical"});
 });
 it("classifies a trusted prefix fork as critical",()=>{
  expect(classifyRecoveryOperationalReport(blocked("TRUSTED_PREFIX_FORK")).severity).toBe("critical");
 });
 it("classifies pending writes and locks separately",()=>{
  const state=classifyRecoveryOperationalReport(blocked("CHECKPOINT_PENDING_REVIEW_REQUIRED","ARCHIVE_WRITER_LOCK_REVIEW_REQUIRED"));
  expect(state.incidents.map(x=>x.category)).toEqual(["writer-lock","incomplete-write"]);
  expect(state.severity).toBe("high");
 });
 it("classifies an unanchored archive tail",()=>{
  expect(classifyRecoveryOperationalReport(blocked("UNANCHORED_ARCHIVE_TAIL")).incidents[0])
   .toMatchObject({category:"unanchored-evidence",severity:"high"});
 });
 it("deduplicates and sorts blockers deterministically",()=>{
  const state=classifyRecoveryOperationalReport(blocked("Z_UNKNOWN","A_UNKNOWN","Z_UNKNOWN"));
  expect(state.incidents.map(x=>x.code)).toEqual(["A_UNKNOWN","Z_UNKNOWN"]);
 });
 it("preserves unknown blockers without claiming safe recovery",()=>{
  const state=classifyRecoveryOperationalReport(blocked("FUTURE_BLOCKER"));
  expect(state).toMatchObject({safeToResume:false,severity:"high",requiresManualReview:true});
  expect(state.incidents[0].category).toBe("unclassified");
 });
 it("rejects contradictory or malformed operational reports",()=>{
  for(const value of [null,{}, {...ready,blockers:["BAD"]},blocked(123),{...blocked("X"),safeToResume:true}])
   expect(()=>classifyRecoveryOperationalReport(value)).toThrow();
 });
 it("freezes the diagnostic report and incidents",()=>{
  const state=classifyRecoveryOperationalReport(blocked("ARCHIVE_ROLLBACK"));
  expect(Object.isFrozen(state)).toBe(true);
  expect(Object.isFrozen(state.incidents)).toBe(true);
  expect(Object.isFrozen(state.incidents[0])).toBe(true);
 });
 it("exposes diagnostics through the real integration without mutating checkpoint",async()=>{
  const root=await mkdtemp(join(tmpdir(),"xsus-diagnostics-v53-"));
  try{
   const r=createIncidentRecoveryIntegration({
    archiveDirectory:join(root,"archive"),checkpointDirectory:join(root,"checkpoint"),
    archiveKey:"a".repeat(48),checkpointKey:"b".repeat(48),
    archiveKeyId:"diagnostics-archive",checkpointKeyId:"diagnostics-checkpoint",
    authorize:async()=>true
   });
   await r.initializeCheckpoint();
   const before=await r.readCheckpoint();
   expect(await r.inspectRecoveryDiagnostics()).toMatchObject({status:"ready",safeToResume:true});
   await writeFile(join(root,"checkpoint","checkpoint.pending"),"partial");
   const state=await r.inspectRecoveryDiagnostics();
   expect(state).toMatchObject({safeToResume:false,requiresManualReview:true});
   expect(state.incidents.some(x=>x.category==="incomplete-write")).toBe(true);
   expect(await r.readCheckpoint()).toEqual(before);
  }finally{await rm(root,{recursive:true,force:true});}
 });
 it("propagates operational reader errors without suppressing them",async()=>{
  const error=Object.assign(new Error("corrupt"),{code:"XSUS_CHECKPOINT_SIGNATURE"});
  const r=createRecoveryDiagnostics({inspectOperationalReadiness:async()=>{throw error;}});
  await expect(r.assess()).rejects.toBe(error);
 });
});

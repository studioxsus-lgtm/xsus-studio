import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createReviewControlPlane} from "../../next-engines/orchestration/review-control-plane.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {reconcileReviewRecord} from "../../next-engines/orchestration/review-reconciliation.js";

const req=(id="phase25")=>({
 contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}
});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-phase25-"));
 try{return await fn(join(dir,"journal.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper six engines phase 25 — recovery and interruption regression",()=>{
 it("recovers after ten sequential injected storage failures without leaking capacity",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  const plane=createReviewControlPlane({failureThreshold:20,maxInFlight:1});
  for(let i=0;i<10;i++){
   await expect(plane.run(req("failed-"+i),{
    save:async()=>{throw Error("INJECTED_STORAGE_FAILURE");},load:()=>store.load()
   })).rejects.toThrow("INJECTED_STORAGE_FAILURE");
   expect(plane.snapshot().health.inFlight).toBe(0);
  }
  const result=await plane.run(req("recovered"),store);
  expect(result).toMatchObject({recorded:true,executionAuthorized:false,sideEffects:false});
  expect(plane.snapshot()).toMatchObject({health:{inFlight:0,accepted:11},circuit:{state:"closed",failures:0}});
  expect(await reconcileReviewRecord({requestId:"recovered",traceId:"trace-recovered"},store))
   .toMatchObject({recorded:true,retrySafe:false,executionAuthorized:false});
 }));
 it("does not release capacity prematurely when a caller cancels a pending write",async()=>{
  const plane=createReviewControlPlane({maxInFlight:1,failureThreshold:5,timeoutMs:10000});
  const gate=deferred();
  const controller=new AbortController();
  let started=0;
  const pending=plane.run(req("cancelled"),{
   save:async()=>{started++;await gate.promise;throw Error("INTERRUPTED_WRITE");},load:async()=>null
  },{signal:controller.signal});
  expect(started).toBe(1);
  controller.abort();
  await expect(pending).rejects.toMatchObject({code:"REQUEST_CANCELLED"});
  expect(plane.snapshot().health.inFlight).toBe(1);
  await expect(plane.run(req("blocked"),{})).rejects.toMatchObject({code:"CAPACITY_EXCEEDED"});
  gate.resolve();
  for(let i=0;i<20&&plane.snapshot().health.inFlight;i++)
   await new Promise(resolve=>setTimeout(resolve,1));
  expect(plane.snapshot().health.inFlight).toBe(0);
  expect(started).toBe(1);
 });
 it("preserves persisted bytes when a conflicting request arrives after recovery",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  const plane=createReviewControlPlane({failureThreshold:10});
  await plane.run(req("original"),store);
  const original=await readFile(filePath,"utf8");
  for(let i=0;i<8;i++)
   await expect(plane.run(req("conflict-"+i),store)).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
  expect(await readFile(filePath,"utf8")).toBe(original);
  expect(await reconcileReviewRecord({requestId:"original",traceId:"trace-original"},store))
   .toMatchObject({recorded:true,executionAuthorized:false});
 }));
 it("keeps one persistent journal across repeated control-plane instances",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  const initial=createReviewControlPlane();
  await initial.run(req("stable"),store);
  const original=await readFile(filePath,"utf8");
  for(let i=0;i<12;i++){
   const plane=createReviewControlPlane();
   const result=await plane.run(req("stable"),createPersistentDecisionJournalStore({filePath}));
   expect(result).toMatchObject({recorded:true,executionAuthorized:false,sideEffects:false});
  }
  expect(await readFile(filePath,"utf8")).toBe(original);
 }));
 it("reports no record when a failed write never persisted anything",async()=>fixture(async filePath=>{
  const plane=createReviewControlPlane();
  await expect(plane.run(req("missing"),{
   save:async()=>{throw Error("DISK_FAILURE");},load:async()=>null
  })).rejects.toThrow("DISK_FAILURE");
  const store=createPersistentDecisionJournalStore({filePath});
  const recovered=await reconcileReviewRecord({requestId:"missing",traceId:"trace-missing"},store);
  expect(recovered).toMatchObject({state:"not_observed",recorded:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
 }));
});

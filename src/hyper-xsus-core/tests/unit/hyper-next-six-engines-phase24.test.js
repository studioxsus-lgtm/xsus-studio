import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createReviewControlPlane} from "../../next-engines/orchestration/review-control-plane.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {reconcileReviewRecord} from "../../next-engines/orchestration/review-reconciliation.js";

const req=(id="phase24",trace="trace24")=>({
  contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
  operation:"orchestration.coordinate",payload:{inputs:{}},
  context:{principalId:"tester",traceId:trace,authorizationRef:"policy:test"}
});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(fn){
  const dir=await mkdtemp(join(tmpdir(),"xsus-phase24-"));
  try{return await fn(join(dir,"journal.json"));}
  finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper six engines phase 24 — combined failure integrity",()=>{
  it("recovers a journal after a caller timeout without retrying its write",async()=>fixture(async filePath=>{
    const store=createPersistentDecisionJournalStore({filePath});
    const gate=deferred();
    let writes=0;
    const delayed={
      save:async response=>{writes++;await gate.promise;return store.save(response);},
      load:()=>store.load()
    };
    const plane=createReviewControlPlane({timeoutMs:15,maxInFlight:1,failureThreshold:3});
    await expect(plane.run(req(),delayed)).rejects.toMatchObject({code:"REQUEST_TIMEOUT"});
    expect(plane.snapshot().health).toMatchObject({inFlight:1,timedOut:1});
    await expect(plane.run(req("overflow"),delayed)).rejects.toMatchObject({code:"CAPACITY_EXCEEDED"});
    gate.resolve();
    // Caller timeout does not cancel the underlying write. Wait for the
    // resource guard to release capacity, using a bounded wall-clock deadline
    // rather than assuming CI will settle within 150 ms.
    const settleBy=Date.now()+5000;
    while(plane.snapshot().health.inFlight!==0&&Date.now()<settleBy)
      await new Promise(resolve=>setTimeout(resolve,10));
    expect(plane.snapshot().health.inFlight).toBe(0);
    const recovered=await reconcileReviewRecord({requestId:"phase24",traceId:"trace24"},store);
    expect(recovered).toMatchObject({recorded:true,retrySafe:false,executionAuthorized:false,sideEffects:false});
    expect(writes).toBe(1);
  }));
  it("keeps the original journal intact when another identity conflicts",async()=>fixture(async filePath=>{
    const store=createPersistentDecisionJournalStore({filePath});
    const plane=createReviewControlPlane({failureThreshold:5});
    const first=await plane.run(req(),store);
    expect(first).toMatchObject({recorded:true,executionAuthorized:false,sideEffects:false});
    const before=await readFile(filePath,"utf8");
    await expect(plane.run(req("conflict","other-trace"),store))
      .rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
    expect(await readFile(filePath,"utf8")).toBe(before);
    expect(await reconcileReviewRecord({requestId:"phase24",traceId:"trace24"},store))
      .toMatchObject({recorded:true,retrySafe:false,executionAuthorized:false});
  }));
  it("rejects corrupted persistence rather than overwriting it",async()=>fixture(async filePath=>{
    const store=createPersistentDecisionJournalStore({filePath});
    const plane=createReviewControlPlane({failureThreshold:5});
    await plane.run(req(),store);
    const {writeFile}=await import("node:fs/promises");
    await writeFile(filePath,"{corrupt","utf8");
    await expect(plane.run(req(),store)).rejects.toMatchObject({code:"CORRUPT_JOURNAL"});
    await expect(reconcileReviewRecord({requestId:"phase24",traceId:"trace24"},store))
      .rejects.toMatchObject({code:"CORRUPT_JOURNAL"});
    expect(await readFile(filePath,"utf8")).toBe("{corrupt");
  }));
  it("blocks new work after repeated storage failures and reports health",async()=>{
    const plane=createReviewControlPlane({failureThreshold:2,maxInFlight:2});
    let writes=0;
    const broken={save:async()=>{writes++;throw Error("STORAGE_DOWN");},load:async()=>null};
    await expect(plane.run(req("one"),broken)).rejects.toThrow("STORAGE_DOWN");
    await expect(plane.run(req("two"),broken)).rejects.toThrow("STORAGE_DOWN");
    await expect(plane.run(req("three"),broken)).rejects.toMatchObject({code:"CIRCUIT_OPEN"});
    expect(writes).toBe(2);
    expect(plane.snapshot()).toMatchObject({
      circuit:{state:"open",failures:2},health:{inFlight:0,accepted:2},
      executionAuthorized:false,sideEffects:false
    });
  });
  it("preserves idempotent records across repeated review requests",async()=>fixture(async filePath=>{
    const store=createPersistentDecisionJournalStore({filePath});
    const plane=createReviewControlPlane({maxInFlight:2});
    const original=await plane.run(req(),store);
    const firstBytes=await readFile(filePath,"utf8");
    for(let i=0;i<12;i++){
      const next=await plane.run(req(),store);
      expect(next).toEqual(original);
    }
    expect(await readFile(filePath,"utf8")).toBe(firstBytes);
    expect(plane.snapshot().health).toMatchObject({inFlight:0,accepted:13,rejected:0});
  }));
});

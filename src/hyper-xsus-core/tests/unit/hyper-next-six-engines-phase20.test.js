import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createReviewResourceGuard} from "../../next-engines/orchestration/resource-guard.js";
import {createReviewDeadline} from "../../next-engines/orchestration/review-deadline.js";
import {reconcileReviewRecord} from "../../next-engines/orchestration/review-reconciliation.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";

const req=id=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
  operation:"orchestration.coordinate",payload:{inputs:{}},
  context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(fn){
  const dir=await mkdtemp(join(tmpdir(),"xsus-phase20-"));
  try{return await fn(join(dir,"journal.json"));}
  finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper six engines phase 20 — sustained review-only resilience",()=>{
  it("admits exactly eight pending requests and rejects overflow without writes",async()=>{
    const guard=createReviewResourceGuard({maxInFlight:8});
    const gate=deferred();
    let writes=0;
    const store={save:async()=>{writes++;await gate.promise;throw Error("INJECTED");},load:async()=>null};
    const pending=Array.from({length:8},(_,i)=>guard.run(req("pending-"+i),store));
    expect(guard.metrics()).toMatchObject({inFlight:8,accepted:8,rejected:0});
    const overflow=await Promise.allSettled(Array.from({length:24},(_,i)=>guard.run(req("overflow-"+i),store)));
    expect(overflow.every(x=>x.status==="rejected"&&x.reason.code==="CAPACITY_EXCEEDED")).toBe(true);
    expect(writes).toBe(8);
    expect(guard.metrics()).toMatchObject({inFlight:8,accepted:8,rejected:24});
    gate.resolve();
    const finished=await Promise.allSettled(pending);
    expect(finished.every(x=>x.status==="rejected"&&x.reason.message==="INJECTED")).toBe(true);
    expect(guard.metrics().inFlight).toBe(0);
  });
  it("releases capacity across 30 consecutive persistence failures",async()=>{
    const guard=createReviewResourceGuard({maxInFlight:1});
    for(let i=0;i<30;i++){
      await expect(guard.run(req("fail-"+i),{save:async()=>{throw Error("IO_FAILURE");},load:async()=>null})).rejects.toThrow("IO_FAILURE");
      expect(guard.metrics().inFlight).toBe(0);
    }
    expect(guard.metrics()).toMatchObject({accepted:30,rejected:0,inFlight:0});
  });
  it("preserves one verified journal through 20 idempotent writes",async()=>fixture(async filePath=>{
    const guard=createReviewResourceGuard({maxInFlight:4});
    const store=createPersistentDecisionJournalStore({filePath});
    for(let i=0;i<20;i++){
      const result=await guard.run(req("stable"),store);
      expect(result).toMatchObject({recorded:true,executionAuthorized:false,sideEffects:false});
    }
    expect(guard.metrics()).toMatchObject({accepted:20,rejected:0,inFlight:0});
    const observed=await reconcileReviewRecord({requestId:"stable",traceId:"trace-stable"},store);
    expect(observed).toMatchObject({recorded:true,retrySafe:false,executionAuthorized:false});
  }));
  it("rejects conflicting identities without overwriting a persisted journal",async()=>fixture(async filePath=>{
    const store=createPersistentDecisionJournalStore({filePath});
    const guard=createReviewResourceGuard({maxInFlight:3});
    await guard.run(req("original"),store);
    const attempts=await Promise.allSettled(Array.from({length:12},(_,i)=>guard.run(req("other-"+i),store)));
    expect(attempts.every(x=>x.status==="rejected")).toBe(true);
    const observed=await reconcileReviewRecord({requestId:"original",traceId:"trace-original"},store);
    expect(observed).toMatchObject({recorded:true,executionAuthorized:false,sideEffects:false});
  }));
  it("keeps a pending write counted after cancellation until the write settles",async()=>{
    const deadline=createReviewDeadline({timeoutMs:10000,maxInFlight:1});
    const gate=deferred();
    const controller=new AbortController();
    let started=false;
    const pending=deadline.run(req("cancelled"),{
      save:async()=>{started=true;await gate.promise;throw Error("IO_FAILURE");},
      load:async()=>null
    },{signal:controller.signal});
    expect(started).toBe(true);
    controller.abort();
    await expect(pending).rejects.toMatchObject({code:"REQUEST_CANCELLED"});
    expect(deadline.metrics()).toMatchObject({inFlight:1,cancelled:1});
    await expect(deadline.run(req("blocked"),{})).rejects.toMatchObject({code:"CAPACITY_EXCEEDED"});
    gate.resolve();
    await tick();
    expect(deadline.metrics().inFlight).toBe(0);
  });
  it("keeps read-only reconciliation non-authorizing for absent records",async()=>{
    let writes=0;
    for(let i=0;i<25;i++){
      const result=await reconcileReviewRecord({requestId:"missing-"+i,traceId:"trace-"+i},{
        load:async()=>null,save:async()=>{writes++;}
      });
      expect(result).toMatchObject({state:"not_observed",retrySafe:false,executionAuthorized:false,sideEffects:false});
    }
    expect(writes).toBe(0);
  });
});

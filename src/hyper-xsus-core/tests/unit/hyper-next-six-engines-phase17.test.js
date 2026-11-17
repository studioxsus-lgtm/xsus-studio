import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createReviewResourceGuard} from "../../next-engines/orchestration/resource-guard.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
const req=(id="phase17",claim="Example")=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{truth:{claim,evidence:[]}}},context:{principalId:"tester",traceId:"trace17",authorizationRef:"policy:test"}});
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),"xsus-phase17-"));try{await fn(join(dir,"journal.json"));}finally{await rm(dir,{recursive:true,force:true});}}
describe("Hyper six engines phase 17 — local resource admission",()=>{
 it("accepts a bounded request and verifies its persistence",async()=>fixture(async filePath=>{
  const guard=createReviewResourceGuard({maxRequestBytes:2048,maxInFlight:2});
  const output=await guard.run(req(),createPersistentDecisionJournalStore({filePath}));
  expect(output).toMatchObject({recorded:true,executionAuthorized:false});
  expect(guard.metrics()).toMatchObject({inFlight:0,accepted:1,rejected:0});
 }));
 it("rejects oversized UTF-8 payloads before touching persistence",async()=>{
  let called=false;
  const guard=createReviewResourceGuard({maxRequestBytes:512});
  await expect(guard.run(req("large","é".repeat(500)),{save:async()=>{called=true;}})).rejects.toMatchObject({code:"REQUEST_TOO_LARGE"});
  expect(called).toBe(false);
  expect(guard.metrics().inFlight).toBe(0);
 });
 it("rejects circular request structures",async()=>{
  const input=req();input.self=input;
  const guard=createReviewResourceGuard();
  await expect(guard.run(input,{})).rejects.toMatchObject({code:"INVALID_INPUT"});
 }));
 it("enforces concurrency limit while the first request is pending",async()=>{
  const guard=createReviewResourceGuard({maxInFlight:1});
  let release;
  const barrier=new Promise(resolve=>release=resolve);
  const store={save:async()=>{await barrier;throw new Error("INJECT_FAILURE");},load:async()=>null};
  const first=guard.run(req(),store);
  expect(guard.metrics().inFlight).toBe(1);
  await expect(guard.run(req("second"),store)).rejects.toMatchObject({code:"CAPACITY_EXCEEDED"});
  release();
  await expect(first).rejects.toThrow("INJECT_FAILURE");
  expect(guard.metrics()).toMatchObject({inFlight:0,accepted:1,rejected:1});
 }));
 it("releases capacity after a persistence failure",async()=>fixture(async filePath=>{
  const guard=createReviewResourceGuard({maxInFlight:1});
  await expect(guard.run(req(),{save:async()=>{throw new Error("IO_ERROR");},load:async()=>null})).rejects.toThrow("IO_ERROR");
  const result=await guard.run(req(),createPersistentDecisionJournalStore({filePath}));
  expect(result.recorded).toBe(true);
  expect(guard.metrics().inFlight).toBe(0);
 }));
 it("rejects invalid limits",()=>{
  expect(()=>createReviewResourceGuard({maxInFlight:0})).toThrow();
  expect(()=>createReviewResourceGuard({maxRequestBytes:-1})).toThrow();
  expect(()=>createReviewResourceGuard({maxInFlight:1.5})).toThrow();
 });
 it("reports a read-only snapshot of counters",()=>{
  const guard=createReviewResourceGuard();
  const snapshot=guard.metrics();
  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(snapshot).toMatchObject({accepted:0,rejected:0,inFlight:0});
 });
});

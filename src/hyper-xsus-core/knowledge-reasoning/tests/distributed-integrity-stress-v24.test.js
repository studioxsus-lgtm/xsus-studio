import {describe,it,expect} from "vitest";
import {createFencedAuditCoordinator} from "../fenced-audit-coordinator.js";
import {createAuditReconciler} from "../audit-reconciler.js";

/**
 * v2.4 deterministic integration stress harness. All instances share
 * one simulated backend; this is NOT a distributed production backend.
 */
function harness(){
 let mark=1,latest=1,owner=null,epoch=0;
 const stats={advances:0,conflicts:0,releases:0};
 const lease={
  acquire:async()=>{const t=++epoch;owner=t;return t;},
  release:async t=>{stats.releases++;if(owner===t)owner=null;}
 };
 const highWater={
  read:async()=>mark,
  advance:async(expected,next,t)=>{
   if(owner!==t){stats.conflicts++;throw Object.assign(Error("stale fence"),{code:"XSUS_FENCE_STALE"});}
   if(mark!==expected||next<=mark){stats.conflicts++;throw Object.assign(Error("CAS"),{code:"XSUS_HIGH_WATER_CONFLICT"});}
   mark=next;stats.advances++;
  }
 };
 const anchors={
  list:async()=>[latest],
  verify:async()=>{},
  rotate:async s=>{if(s.lastSequence<=latest)throw Object.assign(Error("nonmonotonic"),{code:"XSUS_ANCHOR_NONMONOTONIC"});latest=s.lastSequence;return {sequence:latest};}
 };
 return {anchors,highWater,lease,stats,get mark(){return mark;},get latest(){return latest;},
  setLatest:n=>{latest=n;},setMark:n=>{mark=n;},expire:()=>{owner=null;}};
}
const snapshot=n=>({lastSequence:n});
describe("Hyper Audit v2.4 — shared-backend contention and recovery stress",()=>{
 it("runs 100 sequential authenticated advances without regression",async()=>{
  const h=harness(),c=createFencedAuditCoordinator(h);
  for(let n=2;n<=101;n++)expect((await c.advance(snapshot(n))).sequence).toBe(n);
  expect(h.mark).toBe(101);expect(h.stats.advances).toBe(100);
 });
 it("rejects competing coordinators and never advances mark twice",async()=>{
  const h=harness(),a=createFencedAuditCoordinator(h),b=createFencedAuditCoordinator(h);
  const results=await Promise.allSettled([a.advance(snapshot(2)),b.advance(snapshot(2))]);
  expect(results.filter(x=>x.status==="fulfilled").length).toBeLessThanOrEqual(1);
  expect(results.filter(x=>x.status==="rejected").length).toBeGreaterThanOrEqual(1);
  expect(h.stats.advances).toBeLessThanOrEqual(1);
  expect(h.mark).toBeLessThanOrEqual(2);
  if(h.latest>h.mark){
   await expect(createFencedAuditCoordinator(h).inspect(snapshot(2)))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_PENDING"});
  }
 });
 it("detects pending anchor and requires explicit reconciliation",async()=>{
  const h=harness();h.setLatest(2);
  const c=createFencedAuditCoordinator(h);
  await expect(c.inspect(snapshot(2))).rejects.toMatchObject({code:"XSUS_ANCHOR_PENDING"});
  const r=createAuditReconciler({...h,authorize:async()=>true});
  expect(await r.reconcile(snapshot(2))).toEqual({sequence:2,status:"reconciled"});
  expect((await c.inspect(snapshot(2))).status).toBe("verified");
 });
 it("does not reconcile a pending checkpoint when review denies",async()=>{
  const h=harness();h.setLatest(2);
  const r=createAuditReconciler({...h,authorize:async()=>false});
  await expect(r.reconcile(snapshot(2))).rejects.toMatchObject({code:"XSUS_RECONCILE_DENIED"});
  expect(h.mark).toBe(1);
 });
 it("detects deletion and refuses both inspection and reconciliation",async()=>{
  const h=harness();h.setMark(3);h.setLatest(2);
  await expect(createFencedAuditCoordinator(h).inspect(snapshot(3)))
   .rejects.toMatchObject({code:"XSUS_ANCHOR_DELETION"});
  await expect(createAuditReconciler({...h,authorize:async()=>true}).reconcile(snapshot(3)))
   .rejects.toMatchObject({code:"XSUS_ANCHOR_DELETION"});
 });
 it("rejects expired fence after rotation and preserves pending state",async()=>{
  const h=harness(),rotate=h.anchors.rotate;
  h.anchors.rotate=async s=>{const result=await rotate(s);h.expire();return result;};
  await expect(createFencedAuditCoordinator(h).advance(snapshot(2)))
   .rejects.toMatchObject({code:"XSUS_FENCE_STALE"});
  expect(h.mark).toBe(1);expect(h.latest).toBe(2);
 });
 it("stress-tests 50 approved pending recoveries in sequence",async()=>{
  const h=harness(),r=createAuditReconciler({...h,authorize:async()=>true});
  for(let n=2;n<=51;n++){h.setLatest(n);expect((await r.reconcile(snapshot(n))).sequence).toBe(n);}
  expect(h.mark).toBe(51);expect(h.stats.advances).toBe(50);
 });
});

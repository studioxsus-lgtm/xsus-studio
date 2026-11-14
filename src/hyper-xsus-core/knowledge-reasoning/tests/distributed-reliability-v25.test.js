import {describe,it,expect} from "vitest";
import {createFencedAuditCoordinator} from "../fenced-audit-coordinator.js";
import {createAuditReconciler} from "../audit-reconciler.js";

// Deterministic fault-injection harness, not a production distributed store.
function rig(){
 let committed=1,latest=1,owner=null,epoch=0,denied=0,success=0;
 const lease={
  acquire:async()=>{owner=++epoch;return owner;},
  release:async token=>{if(owner===token)owner=null;}
 };
 const highWater={
  read:async()=>committed,
  advance:async(expected,next,token)=>{
   if(token!==owner||committed!==expected||next<=committed){
    denied++;throw Object.assign(Error("fencing or CAS conflict"),{code:"XSUS_HIGH_WATER_CONFLICT"});
   }
   committed=next;success++;
  }
 };
 const anchors={
  list:async()=>[latest],
  verify:async()=>{},
  rotate:async snapshot=>{
   if(snapshot.lastSequence<=latest)throw Object.assign(Error("nonmonotonic"),{code:"XSUS_ANCHOR_NONMONOTONIC"});
   latest=snapshot.lastSequence;return {sequence:latest};
  }
 };
 return {anchors,lease,highWater,get committed(){return committed;},
  get latest(){return latest;},get denied(){return denied;},
  get success(){return success;},expire:()=>{owner=null;},
  setLatest:n=>{latest=n;},setCommitted:n=>{committed=n;}};
}
const snap=n=>({lastSequence:n});
describe("Hyper Audit v2.5 — deterministic reliability fault injection",()=>{
 it("performs 1000 committed advances without high-water regression",async()=>{
  const r=rig(),c=createFencedAuditCoordinator(r);
  for(let n=2;n<=1001;n++){
   const result=await c.advance(snap(n));
   expect(result.sequence).toBe(n);
  }
  expect(r.committed).toBe(1001);
  expect(r.latest).toBe(1001);
  expect(r.success).toBe(1000);
 });
 it("survives 100 injected expired leases with explicit recovery",async()=>{
  const r=rig(),c=createFencedAuditCoordinator(r);
  const original=r.anchors.rotate;
  r.anchors.rotate=async snapshot=>{const result=await original(snapshot);r.expire();return result;};
  const recovery=createAuditReconciler({...r,authorize:async()=>true});
  for(let n=2;n<=101;n++){
   await expect(c.advance(snap(n))).rejects.toMatchObject({code:"XSUS_HIGH_WATER_CONFLICT"});
   expect(r.committed).toBe(n-1);
   expect(r.latest).toBe(n);
   expect((await recovery.reconcile(snap(n))).sequence).toBe(n);
  }
  expect(r.committed).toBe(101);
  expect(r.denied).toBe(100);
 });
 it("does not advance across 100 denied recovery attempts",async()=>{
  const r=rig();r.setLatest(2);
  const recovery=createAuditReconciler({...r,authorize:async()=>false});
  for(let i=0;i<100;i++)
   await expect(recovery.reconcile(snap(2))).rejects.toMatchObject({code:"XSUS_RECONCILE_DENIED"});
  expect(r.committed).toBe(1);
  expect(r.success).toBe(0);
 });
 it("detects rollback after a long committed history",async()=>{
  const r=rig(),c=createFencedAuditCoordinator(r);
  for(let n=2;n<=201;n++)await c.advance(snap(n));
  r.setLatest(199);
  await expect(c.inspect(snap(201))).rejects.toMatchObject({code:"XSUS_ANCHOR_DELETION"});
  expect(r.committed).toBe(201);
 });
 it("rejects concurrent duplicate commits without double counting",async()=>{
  const r=rig(),a=createFencedAuditCoordinator(r),b=createFencedAuditCoordinator(r);
  const outcomes=await Promise.allSettled([a.advance(snap(2)),b.advance(snap(2))]);
  expect(outcomes.filter(x=>x.status==="fulfilled").length).toBeLessThanOrEqual(1);
  expect(outcomes.some(x=>x.status==="rejected")).toBe(true);
  expect(r.success).toBeLessThanOrEqual(1);
  expect(r.committed).toBeLessThanOrEqual(2);
 });
});

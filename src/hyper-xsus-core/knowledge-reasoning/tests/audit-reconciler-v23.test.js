import {describe,it,expect} from "vitest";
import {createAuditReconciler} from "../audit-reconciler.js";
const snap=n=>({lastSequence:n});
function fixture({mark=1,latest=2,approved=true}={}){
 let current=mark,active=null,issued=0,releases=0,verified=true;
 const anchors={
  list:async()=>[latest],
  verify:async()=>{if(!verified)throw Error("Bad signature");}
 };
 const lease={
  acquire:async()=>{active=++issued;return active;},
  release:async token=>{releases++;if(active===token)active=null;}
 };
 const highWater={
  read:async()=>current,
  advance:async(expected,next,token)=>{
   if(token!==active)throw Object.assign(Error("Stale token"),{code:"XSUS_FENCE_STALE"});
   if(current!==expected)throw Object.assign(Error("CAS conflict"),{code:"XSUS_HIGH_WATER_CONFLICT"});
   current=next;
  }
 };
 const authorize=async()=>approved;
 return {anchors,lease,highWater,authorize,get mark(){return current;},
  get releases(){return releases;},expire(){active=null;},invalidate(){verified=false;}};
}
const make=f=>createAuditReconciler(f);
describe("Hyper Audit v2.3.0 — explicit reconciliation",()=>{
 it("reconciles authenticated approved pending checkpoint",async()=>{
  const f=fixture();
  expect(await make(f).reconcile(snap(2))).toEqual({sequence:2,status:"reconciled"});
  expect(f.mark).toBe(2);expect(f.releases).toBe(1);
 });
 it("rejects missing independent approval",async()=>{
  const f=fixture({approved:false});
  await expect(make(f).reconcile(snap(2))).rejects.toMatchObject({code:"XSUS_RECONCILE_DENIED"});
  expect(f.mark).toBe(1);
 });
 it("rejects unauthenticated pending checkpoint",async()=>{
  const f=fixture();f.invalidate();
  await expect(make(f).reconcile(snap(2))).rejects.toThrow("Bad signature");
  expect(f.mark).toBe(1);
 });
 it("rejects mismatch between journal and checkpoint",async()=>{
  const f=fixture();
  await expect(make(f).reconcile(snap(3))).rejects.toMatchObject({code:"XSUS_RECONCILE_SNAPSHOT_MISMATCH"});
 });
 it("rejects missing committed checkpoint",async()=>{
  const f=fixture({mark:3,latest:2});
  await expect(make(f).reconcile(snap(2))).rejects.toMatchObject({code:"XSUS_ANCHOR_DELETION"});
 });
 it("rejects reconciliation when no pending checkpoint exists",async()=>{
  const f=fixture({mark:2,latest:2});
  await expect(make(f).reconcile(snap(2))).rejects.toMatchObject({code:"XSUS_RECONCILE_NOT_PENDING"});
 });
 it("rejects expired fencing token at trusted backend",async()=>{
  const f=fixture();f.authorize=async()=>{f.expire();return true;};
  await expect(make(f).reconcile(snap(2))).rejects.toMatchObject({code:"XSUS_FENCE_STALE"});
  expect(f.mark).toBe(1);
 });
 it("rejects concurrent reconciliation in one instance",async()=>{
  const f=fixture();let release;const gate=new Promise(r=>release=r);
  f.authorize=async()=>{await gate;return true;};
  const c=make(f),pending=c.reconcile(snap(2));
  await expect(c.reconcile(snap(2))).rejects.toMatchObject({code:"XSUS_RECONCILE_BUSY"});
  release();await pending;
 });
 it("rejects CAS conflict and does not claim success",async()=>{
  const f=fixture();f.highWater.advance=async()=>{throw Object.assign(Error("CAS conflict"),{code:"XSUS_HIGH_WATER_CONFLICT"});};
  await expect(make(f).reconcile(snap(2))).rejects.toMatchObject({code:"XSUS_HIGH_WATER_CONFLICT"});
  expect(f.mark).toBe(1);
 });
});

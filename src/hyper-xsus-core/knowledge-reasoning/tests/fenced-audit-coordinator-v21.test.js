import {describe,it,expect} from "vitest";
import {createFencedAuditCoordinator} from "../fenced-audit-coordinator.js";
const snap=n=>({lastSequence:n});
function fixture(){
 let mark=1,latest=1,token=0,active=null,releaseCount=0,verified=true;
 const anchors={
  list:async()=>[latest],
  verify:async()=>{if(!verified)throw Error("Bad anchor");},
  rotate:async s=>{latest=s.lastSequence;return {sequence:latest};}
 };
 const lease={
  acquire:async()=>{active=++token;return active;},
  release:async t=>{releaseCount++;if(active===t)active=null;}
 };
 const highWater={
  read:async()=>mark,
  advance:async(expected,next,t)=>{
   if(t!==active)throw Object.assign(Error("Stale fence"),{code:"XSUS_FENCE_STALE"});
   if(mark!==expected)throw Object.assign(Error("CAS conflict"),{code:"XSUS_HIGH_WATER_CONFLICT"});
   mark=next;
  }
 };
 return {anchors,lease,highWater,get mark(){return mark;},
  get latest(){return latest;},get released(){return releaseCount;},
  expire(){active=null;},invalidate(){verified=false;}};
}
const make=f=>createFencedAuditCoordinator(f);
describe("Hyper Audit v2.1.0 — fenced coordination",()=>{
 it("verifies and releases its lease",async()=>{
  const f=fixture();expect(await make(f).inspect(snap(1))).toEqual({sequence:1,status:"verified"});
  expect(f.released).toBe(1);
 });
 it("advances with a backend-enforced fencing token",async()=>{
  const f=fixture();
  expect(await make(f).advance(snap(2))).toEqual({sequence:2,status:"advanced"});
  expect(f.mark).toBe(2);expect(f.released).toBe(1);
 });
 it("rejects an expired token and leaves pending checkpoint",async()=>{
  const f=fixture();
  const rotate=f.anchors.rotate;
  f.anchors.rotate=async s=>{const r=await rotate(s);f.expire();return r;};
  await expect(make(f).advance(snap(2))).rejects.toMatchObject({code:"XSUS_FENCE_STALE"});
  expect(f.mark).toBe(1);expect(f.latest).toBe(2);
  await expect(make(f).inspect(snap(2))).rejects.toMatchObject({code:"XSUS_ANCHOR_PENDING"});
 });
 it("rejects concurrent calls on one coordinator",async()=>{
  const f=fixture();
  let resume;const gate=new Promise(r=>{resume=r;});
  const original=f.lease.acquire;
  f.lease.acquire=async()=>{const t=await original();await gate;return t;};
  const c=make(f),pending=c.inspect(snap(1));
  await expect(c.inspect(snap(1))).rejects.toMatchObject({code:"XSUS_AUDIT_COORDINATOR_BUSY"});
  resume();await pending;
 });
 it("releases lease after invalid anchor",async()=>{
  const f=fixture();f.invalidate();
  await expect(make(f).advance(snap(2))).rejects.toThrow("Bad anchor");
  expect(f.released).toBe(1);expect(f.latest).toBe(1);
 });
 it("rejects nonmonotonic updates",async()=>{
  const f=fixture();
  await expect(make(f).advance(snap(1))).rejects.toMatchObject({code:"XSUS_ANCHOR_NONMONOTONIC"});
 });
 it("rejects deletion relative to trusted mark",async()=>{
  const f=fixture();f.highWater.read=async()=>3;
  await expect(make(f).inspect(snap(3))).rejects.toMatchObject({code:"XSUS_ANCHOR_DELETION"});
 });
 it("rejects an invalid lease token",async()=>{
  const f=fixture();f.lease.acquire=async()=>null;
  await expect(make(f).inspect(snap(1))).rejects.toMatchObject({code:"XSUS_AUDIT_FENCE_INVALID"});
 });
});

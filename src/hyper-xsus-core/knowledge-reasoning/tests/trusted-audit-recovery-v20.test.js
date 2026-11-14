import {describe,it,expect} from "vitest";
import {createTrustedAuditRecovery} from "../trusted-audit-recovery.js";
function fixture({mark=1,seqs=[1],verified=true}={}){
 let current=mark,files=[...seqs],calls=0;
 const anchors={
  list:async()=>[...files],
  verify:async()=>{calls++;if(!verified)throw Error("Bad signature");return files.at(-1);},
  rotate:async snapshot=>{files.push(snapshot.lastSequence);return {sequence:snapshot.lastSequence};}
 };
 const highWater={
  read:async()=>current,
  advance:async(expected,next)=>{
   if(current!==expected)throw Object.assign(Error("CAS failed"),{code:"XSUS_HIGH_WATER_CONFLICT"});
   current=next;
  }
 };
 return {anchors,highWater,get mark(){return current;},get calls(){return calls;},get files(){return files;}};
}
const make=f=>createTrustedAuditRecovery({anchors:f.anchors,highWater:f.highWater});
const snap=n=>({lastSequence:n});
describe("Hyper Audit v2.0.0 — trusted high-water recovery",()=>{
 it("accepts authenticated checkpoint matching external mark",async()=>{
  const f=fixture();expect(await make(f).inspect(snap(1))).toEqual({sequence:1,status:"verified"});
  expect(f.calls).toBe(1);
 });
 it("detects deletion of newest checkpoint",async()=>{
  const f=fixture({mark:3,seqs:[1,2]});
  await expect(make(f).inspect(snap(3))).rejects.toMatchObject({code:"XSUS_ANCHOR_DELETION"});
 });
 it("detects crash window before external mark advancement",async()=>{
  const f=fixture({mark:1,seqs:[1,2]});
  await expect(make(f).inspect(snap(2))).rejects.toMatchObject({code:"XSUS_ANCHOR_PENDING"});
 });
 it("advances anchor and external high-water mark",async()=>{
  const f=fixture();
  expect(await make(f).advance(snap(2))).toEqual({sequence:2,status:"advanced"});
  expect(f.mark).toBe(2);
  expect(await make(f).inspect(snap(2))).toEqual({sequence:2,status:"verified"});
 });
 it("does not advance when current anchor fails verification",async()=>{
  const f=fixture({verified:false});
  await expect(make(f).advance(snap(2))).rejects.toThrow("Bad signature");
  expect(f.mark).toBe(1);expect(f.files).toEqual([1]);
 });
 it("rejects nonmonotonic sequence",async()=>{
  const f=fixture();
  await expect(make(f).advance(snap(1))).rejects.toMatchObject({code:"XSUS_ANCHOR_NONMONOTONIC"});
 });
 it("rejects malformed trusted mark",async()=>{
  const f=fixture();f.highWater.read=async()=>-1;
  await expect(make(f).inspect(snap(1))).rejects.toMatchObject({code:"XSUS_HIGH_WATER_INVALID"});
 });
 it("fails closed if high-water update fails after anchor creation",async()=>{
  const f=fixture();f.highWater.advance=async()=>{throw Error("remote offline");};
  await expect(make(f).advance(snap(2))).rejects.toThrow("remote offline");
  expect(f.files).toEqual([1,2]);
  await expect(make(f).inspect(snap(2))).rejects.toMatchObject({code:"XSUS_ANCHOR_PENDING"});
 });
});

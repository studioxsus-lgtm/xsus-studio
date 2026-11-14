import {describe,it,expect} from "vitest";
import {mkdtemp,rm,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createAuditRecoveryRuntime} from "../audit-recovery-runtime.js";

const h=c=>c.repeat(64);
const one={version:"0.8.0",anchorHash:"GENESIS",lastSequence:1,entries:[{sequence:1,hash:h("a")}]};
const two={...one,lastSequence:2,entries:[...one.entries,{sequence:2,hash:h("b")}]};
async function fixture(fn,{publish=true,approve=true}={}){
 const dir=await mkdtemp(join(tmpdir(),"xsus-runtime-bundle-"));
 let mark=1,owner=null,epoch=0,commits=0,inventory=[],approvals=0;
 const highWater={
  read:async()=>mark,
  advance:async(expected,next,token)=>{
   if(owner!==token||mark!==expected||next<=mark)
    throw Object.assign(Error("CAS/fencing conflict"),{code:"XSUS_HIGH_WATER_CONFLICT"});
   mark=next;commits++;
   if(publish)inventory.push(next);
  }
 };
 const lease={acquire:async()=>{owner=++epoch;return owner;},
  release:async token=>{if(owner===token)owner=null;}};
 const expected={read:async()=>[...inventory]};
 const authorize=async()=>{approvals++;return approve;};
 const create=()=>createAuditRecoveryRuntime({
  anchorDirectory:join(dir,"anchors"),receiptDirectory:join(dir,"receipts"),
  key:"s".repeat(48),keyId:"bundle",highWater,lease,expected,authorize
 });
 try{await fn({create,dir,get mark(){return mark;},get commits(){return commits;},
  get approvals(){return approvals;},inventory});}
 finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper Audit v3.2 — integrated filesystem recovery bundle",()=>{
 it("recovers signed pending anchor, persists receipt and verifies fresh runtime",async()=>{
  await fixture(async f=>{
   const first=f.create();
   await first.anchors.rotate(one);await first.anchors.rotate(two);
   await expect(first.inspect(two)).rejects.toMatchObject({code:"XSUS_ANCHOR_PENDING"});
   expect(await first.recover(two)).toEqual({sequence:2,status:"reconciled",receipts:1});
   expect(await f.create().inspect(two)).toEqual({sequence:2,receipts:1,status:"verified"});
   expect(f.commits).toBe(1);expect(f.approvals).toBe(1);
  });
 });
 it("denial cannot advance trusted mark or create evidence",async()=>{
  await fixture(async f=>{
   const runtime=f.create();await runtime.anchors.rotate(one);await runtime.anchors.rotate(two);
   await expect(runtime.recover(two)).rejects.toMatchObject({code:"XSUS_RECONCILE_DENIED"});
   expect(f.mark).toBe(1);expect(await runtime.receipts.list()).toEqual([]);
  },{approve:false});
 });
 it("post-CAS inventory publication failure is reported without false success",async()=>{
  await fixture(async f=>{
   const runtime=f.create();await runtime.anchors.rotate(one);await runtime.anchors.rotate(two);
   await expect(runtime.recover(two)).rejects.toMatchObject({code:"XSUS_RECOVERY_POSTCOMMIT_UNVERIFIED"});
   expect(f.mark).toBe(2);expect(f.commits).toBe(1);
   await expect(f.create().inspect(two)).rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_UNEXPECTED"});
  },{publish:false});
 });
 it("detects deleted signed receipt using independently published inventory",async()=>{
  await fixture(async f=>{
   const runtime=f.create();await runtime.anchors.rotate(one);await runtime.anchors.rotate(two);
   await runtime.recover(two);
   await unlink(join(f.dir,"receipts","recovery-0000000000000002.json"));
   await expect(f.create().inspect(two)).rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_MISSING"});
  });
 });
 it("denies repeat recovery after committed reconciliation",async()=>{
  await fixture(async f=>{
   const runtime=f.create();await runtime.anchors.rotate(one);await runtime.anchors.rotate(two);
   await runtime.recover(two);
   await expect(f.create().recover(two)).rejects.toMatchObject({code:"XSUS_RECONCILE_NOT_PENDING"});
   expect(f.commits).toBe(1);
  });
 });
});

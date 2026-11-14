import {describe,it,expect} from "vitest";
import {createIntegratedAuditRecovery} from "../integrated-audit-recovery.js";
const tip="b".repeat(64);
const snapshot={lastSequence:2,entries:[{sequence:2,hash:tip}]};
function fixture({deny=false,recordFails=false,corrupt=false}={}){
 let mark=1,approved=0,commits=0,records=[];
 const anchors={verify:async()=>2};
 const highWater={read:async()=>mark};
 const coordinator={inspect:async()=>({sequence:mark,status:"verified"})};
 const receipts={
  list:async()=>records.map(r=>r.sequence),read:async n=>records.find(r=>r.sequence===n),
  verifyAgainst:async({trustedSequence})=>{
   if(corrupt)throw Object.assign(Error("bad evidence"),{code:"XSUS_RECOVERY_RECEIPT_FORK"});
   if(records.some(r=>r.sequence>trustedSequence))throw Error("receipt ahead");
   return {count:records.length,status:"verified"};
  },
  record:async r=>{if(recordFails)throw Error("disk failure");records.push(r);}
 };
 const reconciler={reconcile:async s=>{
  approved++;
  if(deny)throw Object.assign(Error("denied"),{code:"XSUS_RECONCILE_DENIED"});
  if(mark!==1||s.lastSequence!==2)throw Error("unexpected CAS");
  mark=2;commits++;return {sequence:2,status:"reconciled"};
 }};
 const lifecycle=createIntegratedAuditRecovery({anchors,highWater,coordinator,reconciler,receipts});
 return {lifecycle,receipts,get mark(){return mark;},get approved(){return approved;},get commits(){return commits;},get records(){return records;}};
}
describe("Hyper Audit v3.0 — integrated recovery lifecycle",()=>{
 it("records evidence only after approved trusted reconciliation",async()=>{
  const f=fixture();
  expect(await f.lifecycle.recover(snapshot)).toEqual({sequence:2,status:"reconciled",receipts:1});
  expect(f.mark).toBe(2);expect(f.records).toEqual([{previous:1,sequence:2,tipHash:tip}]);
  expect(await f.lifecycle.inspect(snapshot)).toEqual({sequence:2,status:"verified",receipts:1});
 });
 it("denied approval never records evidence or changes trusted mark",async()=>{
  const f=fixture({deny:true});
  await expect(f.lifecycle.recover(snapshot)).rejects.toMatchObject({code:"XSUS_RECONCILE_DENIED"});
  expect(f.mark).toBe(1);expect(f.records).toHaveLength(0);
 });
 it("corrupted existing evidence blocks reviewer invocation",async()=>{
  const f=fixture({corrupt:true});
  await expect(f.lifecycle.recover(snapshot)).rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_FORK"});
  expect(f.approved).toBe(0);expect(f.commits).toBe(0);
 });
 it("receipt write failure reports committed-but-incomplete without retry",async()=>{
  const f=fixture({recordFails:true});
  await expect(f.lifecycle.recover(snapshot)).rejects.toMatchObject({code:"XSUS_RECOVERY_EVIDENCE_INCOMPLETE"});
  expect(f.mark).toBe(2);expect(f.commits).toBe(1);expect(f.records).toHaveLength(0);
 });
 it("rejects missing tip hash after commit as incomplete",async()=>{
  const f=fixture();
  await expect(f.lifecycle.recover({lastSequence:2,entries:[]})).rejects.toMatchObject({code:"XSUS_RECOVERY_EVIDENCE_INCOMPLETE"});
  expect(f.mark).toBe(2);expect(f.records).toHaveLength(0);
 });
 it("prevents overlapping recovery operations",async()=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const f=fixture();
  const lifecycle=createIntegratedAuditRecovery({
   anchors:{verify:async()=>2},highWater:{read:async()=>1},
   coordinator:{inspect:async()=>({sequence:1})},
   reconciler:{reconcile:async()=>{await gate;throw Error("stopped");}},
   receipts:f.receipts
  });
  const first=lifecycle.recover(snapshot);
  await expect(lifecycle.recover(snapshot)).rejects.toMatchObject({code:"XSUS_RECOVERY_LIFECYCLE_BUSY"});
  release();await expect(first).rejects.toThrow("stopped");
 });
});

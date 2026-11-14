import {describe,it,expect} from "vitest";
import {mkdtemp,rm,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentRecoveryReceipts} from "../persistent-recovery-receipts.js";
import {createRecoveryConsistencyGate} from "../recovery-consistency-gate.js";
const hash=x=>x.repeat(64);
const snapshot={lastSequence:3,anchorHash:"GENESIS",entries:[
 {sequence:1,hash:hash("a")},{sequence:2,hash:hash("b")},{sequence:3,hash:hash("c")}]};
async function fixture(fn){
 const directory=await mkdtemp(join(tmpdir(),"xsus-consistency-v31-"));
 const receipts=createPersistentRecoveryReceipts({directory,key:"k".repeat(48),keyId:"v31"});
 try{await fn({directory,receipts});}finally{await rm(directory,{recursive:true,force:true});}
}
function gate(receipts,inventory=[2],mark=3){
 return createRecoveryConsistencyGate({receipts,highWater:{read:async()=>mark},expected:{read:async()=>inventory}});
}
describe("Hyper Audit v3.1 — independent recovery evidence consistency",()=>{
 it("verifies durable evidence after reconstructing gate",async()=>{
  await fixture(async({receipts})=>{
   await receipts.record({previous:1,sequence:2,tipHash:hash("b")});
   expect(await gate(receipts).inspect(snapshot)).toEqual({sequence:3,receipts:1,status:"verified"});
  });
 });
 it("detects missing expected receipt after simulated crash gap",async()=>{
  await fixture(async({receipts})=>{
   await expect(gate(receipts).inspect(snapshot)).rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_MISSING"});
  });
 });
 it("detects deleted committed recovery receipt after restart",async()=>{
  await fixture(async({directory,receipts})=>{
   await receipts.record({previous:1,sequence:2,tipHash:hash("b")});
   await unlink(join(directory,"recovery-0000000000000002.json"));
   await expect(gate(receipts).inspect(snapshot)).rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_MISSING"});
  });
 });
 it("rejects unexpected receipt not present in independent inventory",async()=>{
  await fixture(async({receipts})=>{
   await receipts.record({previous:1,sequence:2,tipHash:hash("b")});
   await expect(gate(receipts,[]).inspect(snapshot)).rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_UNEXPECTED"});
  });
 });
 it("rejects duplicated inventory sequences",async()=>{
  await fixture(async({receipts})=>{
   await expect(gate(receipts,[2,2]).inspect(snapshot)).rejects.toMatchObject({code:"XSUS_RECOVERY_INVENTORY_INVALID"});
  });
 });
 it("rejects expected recovery ahead of trusted high-water",async()=>{
  await fixture(async({receipts})=>{
   await expect(gate(receipts,[4]).inspect(snapshot)).rejects.toMatchObject({code:"XSUS_RECOVERY_INVENTORY_AHEAD"});
  });
 });
 it("detects tampered receipt through cryptographic verification",async()=>{
  await fixture(async({receipts})=>{
   await receipts.record({previous:1,sequence:2,tipHash:hash("b")});
   await expect(gate(receipts).inspect({...snapshot,entries:snapshot.entries.map(e=>e.sequence===2?{...e,hash:hash("d")}:e)}))
    .rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_FORK"});
  });
 });
 it("rejects trusted mark change during inspection",async()=>{
  await fixture(async({receipts})=>{
   await receipts.record({previous:1,sequence:2,tipHash:hash("b")});
   let calls=0;
   const g=createRecoveryConsistencyGate({receipts,expected:{read:async()=>[2]},
    highWater:{read:async()=>++calls===1?3:4}});
   await expect(g.inspect(snapshot)).rejects.toMatchObject({code:"XSUS_RECOVERY_MARK_CHANGED"});
  });
 });
});

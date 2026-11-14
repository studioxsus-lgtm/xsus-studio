import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentRecoveryReceipts} from "../persistent-recovery-receipts.js";

const key="p".repeat(48),keyId="recovery-test",h=c=>c.repeat(64);
const snapshot={lastSequence:3,anchorHash:"GENESIS",entries:[
 {sequence:1,hash:h("a")},{sequence:2,hash:h("b")},{sequence:3,hash:h("c")}]};
const name=n=>`recovery-${String(n).padStart(16,"0")}.json`;
async function fixture(fn){
 const directory=await mkdtemp(join(tmpdir(),"xsus-receipt-v29-"));
 const make=(secret=key)=>createPersistentRecoveryReceipts({directory,key:secret,keyId});
 try{await fn({directory,make});}finally{await rm(directory,{recursive:true,force:true});}
}
describe("Hyper Audit v2.9 — persistent authenticated recovery receipts",()=>{
 it("survives reopening and verifies matching journal evidence",async()=>{
  await fixture(async({make})=>{
   await make().record({previous:1,sequence:2,tipHash:h("b")});
   expect(await make().verifyAgainst({trustedSequence:2,snapshot}))
    .toEqual({count:1,latest:2,status:"verified"});
  });
 });
 it("rejects modified signature after reopening",async()=>{
  await fixture(async({make,directory})=>{
   await make().record({previous:1,sequence:2,tipHash:h("b")});
   const path=join(directory,name(2)),obj=JSON.parse(await readFile(path,"utf8"));
   obj.signature=h("0");await writeFile(path,JSON.stringify(obj));
   await expect(make().read(2)).rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_SIGNATURE"});
  });
 });
 it("rejects wrong verification key",async()=>{
  await fixture(async({make})=>{
   await make().record({previous:1,sequence:2,tipHash:h("b")});
   await expect(make("q".repeat(48)).read(2))
    .rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_SIGNATURE"});
  });
 });
 it("refuses duplicate sequence instead of overwriting evidence",async()=>{
  await fixture(async({make})=>{
   await make().record({previous:1,sequence:2,tipHash:h("b")});
   await expect(make().record({previous:1,sequence:2,tipHash:h("c")}))
    .rejects.toMatchObject({code:"EEXIST"});
  });
 });
 it("detects journal fork against signed receipt",async()=>{
  await fixture(async({make})=>{
   await make().record({previous:1,sequence:2,tipHash:h("b")});
   const fork={...snapshot,entries:snapshot.entries.map(e=>e.sequence===2?{...e,hash:h("d")}:e)};
   await expect(make().verifyAgainst({trustedSequence:2,snapshot:fork}))
    .rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_FORK"});
  });
 });
 it("rejects receipt ahead of trusted high-water",async()=>{
  await fixture(async({make})=>{
   await make().record({previous:1,sequence:2,tipHash:h("b")});
   await expect(make().verifyAgainst({trustedSequence:1,snapshot}))
    .rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_AHEAD"});
  });
 });
 it("detects rollback of journal below recorded recovery",async()=>{
  await fixture(async({make})=>{
   await make().record({previous:1,sequence:2,tipHash:h("b")});
   await expect(make().verifyAgainst({trustedSequence:2,snapshot:{lastSequence:1,entries:snapshot.entries.slice(0,1)}}))
    .rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_ROLLBACK"});
  });
 });
 it("rejects malformed recovery filenames",async()=>{
  await fixture(async({make,directory})=>{
   await writeFile(join(directory,"recovery-corrupt.json"),"{}");
   await expect(make().list()).rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_INVALID"});
  });
 });
 it("detects missing retention evidence rather than assuming integrity",async()=>{
  await fixture(async({make})=>{
   await make().record({previous:1,sequence:2,tipHash:h("b")});
   await expect(make().verifyAgainst({trustedSequence:2,snapshot:{lastSequence:4,anchorHash:h("a"),entries:[{sequence:4,hash:h("c")}]}}))
    .rejects.toMatchObject({code:"XSUS_RECOVERY_RECEIPT_UNVERIFIABLE"});
  });
 });
});

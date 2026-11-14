import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createLocalRecoveryBackend} from "../local-recovery-backend.js";
import {createCrashRecoveryAssessor} from "../crash-recovery-assessor.js";
import {createRecoveryIncidentPolicy} from "../recovery-incident-policy.js";
import {createRecoveryConsistencyGate} from "../recovery-consistency-gate.js";
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-stress-v35-"));
 const directory=join(root,"trusted");
 const make=()=>createLocalRecoveryBackend({directory,key:"z".repeat(48),keyId:"stress"});
 try{await fn({root,directory,make});}finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper Audit v3.5 — durable backend stress and incident integration",()=>{
 it("executes 250 sequential fenced CAS commits and persists complete inventory",async()=>{
  await fixture(async({make})=>{
   const b=make();await b.initialize(0);
   for(let n=1;n<=250;n++){
    const token=await b.lease.acquire();
    await b.highWater.advance(n-1,n,token);
    await b.lease.release(token);
   }
   const fresh=make();
   expect(await fresh.highWater.read()).toBe(250);
   expect(await fresh.expected.read()).toEqual(Array.from({length:250},(_,i)=>i+1));
  });
 },120000);
 it("rejects 40 stale CAS attempts without changing durable state",async()=>{
  await fixture(async({make})=>{
   const b=make();await b.initialize(0);
   const token=await b.lease.acquire();
   await b.highWater.advance(0,1,token);
   for(let n=0;n<40;n++)
    await expect(b.highWater.advance(0,n+2,token)).rejects.toMatchObject({code:"XSUS_HIGH_WATER_CONFLICT"});
   await b.lease.release(token);
   expect(await make().highWater.read()).toBe(1);
   expect(await make().expected.read()).toEqual([1]);
  });
 });
 it("rejects 40 unauthorized fence tokens",async()=>{
  await fixture(async({make})=>{
   const b=make();await b.initialize(0);
   const token=await b.lease.acquire();
   for(let n=0;n<40;n++)
    await expect(b.highWater.advance(0,1,"forged-"+n)).rejects.toMatchObject({code:"XSUS_HIGH_WATER_CONFLICT"});
   await b.lease.release(token);
   expect(await make().highWater.read()).toBe(0);
  });
 });
 it("rejects 25 concurrent lock contenders",async()=>{
  await fixture(async({make})=>{
   const b=make();await b.initialize(0);
   const token=await b.lease.acquire();
   const results=await Promise.allSettled(Array.from({length:25},()=>make().lease.acquire()));
   expect(results.every(r=>r.status==="rejected"&&r.reason.code==="XSUS_AUDIT_FENCE_BUSY")).toBe(true);
   await b.lease.release(token);
  });
 });
 it("fails closed when the signed trusted state is deleted",async()=>{
  await fixture(async({make,directory})=>{
   const b=make();await b.initialize(1);
   await unlink(join(directory,"state.json"));
   await expect(make().highWater.read()).rejects.toMatchObject({code:"XSUS_LOCAL_STATE_MISSING"});
  });
 });
 it("fails closed when a signed inventory entry is forged",async()=>{
  await fixture(async({make,directory})=>{
   const b=make();await b.initialize(1);
   const path=join(directory,"state.json");
   const obj=JSON.parse(await readFile(path,"utf8"));
   obj.inventory=[1];await writeFile(path,JSON.stringify(obj));
   await expect(make().expected.read()).rejects.toMatchObject({code:"XSUS_LOCAL_STATE_SIGNATURE"});
  });
 });
 it("fails closed when the state signature is malformed",async()=>{
  await fixture(async({make,directory})=>{
   const b=make();await b.initialize(1);
   const path=join(directory,"state.json");
   const obj=JSON.parse(await readFile(path,"utf8"));
   obj.signature="not-hex";await writeFile(path,JSON.stringify(obj));
   await expect(make().highWater.read()).rejects.toMatchObject({code:"XSUS_LOCAL_STATE_INVALID"});
  });
 });
 it("fails closed on corrupted state JSON",async()=>{
  await fixture(async({make,directory})=>{
   const b=make();await b.initialize(1);
   await writeFile(join(directory,"state.json"),"{broken");
   await expect(make().highWater.read()).rejects.toThrow();
  });
 });
 it("incident policy refuses resume with missing evidence after durable CAS",async()=>{
  await fixture(async({make,directory})=>{
   const b=make();await b.initialize(1);
   const token=await b.lease.acquire();
   await b.highWater.advance(1,2,token);await b.lease.release(token);
   const receipts={list:async()=>[],read:async()=>null,verifyAgainst:async()=>({count:0,status:"verified"})};
   const assessor=createCrashRecoveryAssessor({directory,highWater:b.highWater,expected:b.expected,receipts});
   const consistency=createRecoveryConsistencyGate({highWater:b.highWater,expected:b.expected,receipts});
   const policy=createRecoveryIncidentPolicy({assessor,consistency,highWater:b.highWater,expected:b.expected,receipts});
   const report=await policy.evaluate({lastSequence:2,entries:[]});
   expect(report).toMatchObject({status:"manual-intervention-required",safeToResume:false,missingReceipts:[2]});
  });
 });
 it("incident policy verifies a clean initialized state through signed gate",async()=>{
  await fixture(async({make,directory})=>{
   const b=make();await b.initialize(0);
   const receipts={list:async()=>[],read:async()=>null,verifyAgainst:async()=>({count:0,status:"verified"})};
   const assessor=createCrashRecoveryAssessor({directory,highWater:b.highWater,expected:b.expected,receipts});
   const consistency=createRecoveryConsistencyGate({highWater:b.highWater,expected:b.expected,receipts});
   const policy=createRecoveryIncidentPolicy({assessor,consistency,highWater:b.highWater,expected:b.expected,receipts});
   expect(await policy.evaluate({lastSequence:0,entries:[]})).toMatchObject({status:"verified",safeToResume:true});
  });
 });
});

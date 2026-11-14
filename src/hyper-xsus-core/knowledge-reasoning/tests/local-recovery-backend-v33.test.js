import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createLocalRecoveryBackend} from "../local-recovery-backend.js";
import {createAuditRecoveryRuntime} from "../audit-recovery-runtime.js";
const hash=c=>c.repeat(64);
const s1={version:"0.8.0",anchorHash:"GENESIS",lastSequence:1,entries:[{sequence:1,hash:hash("a")}]};
const s2={...s1,lastSequence:2,entries:[...s1.entries,{sequence:2,hash:hash("b")}]};
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-local-v33-"));
 const create=()=>createLocalRecoveryBackend({directory:join(root,"trusted"),key:"t".repeat(48),keyId:"v33"});
 try{await fn({root,create});}finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper Audit v3.3 — durable single-host coordination",()=>{
 it("persists CAS and independent inventory across reconstructed adapters",async()=>{
  await fixture(async({create})=>{
   const b=create();await b.initialize(1);
   const token=await b.lease.acquire();
   await b.highWater.advance(1,2,token);await b.lease.release(token);
   expect(await create().highWater.read()).toBe(2);
   expect(await create().expected.read()).toEqual([2]);
  });
 });
 it("rejects competing process-style lease holders",async()=>{
  await fixture(async({create})=>{
   const a=create(),b=create();await a.initialize(1);
   const token=await a.lease.acquire();
   await expect(b.lease.acquire()).rejects.toMatchObject({code:"XSUS_AUDIT_FENCE_BUSY"});
   await a.lease.release(token);
   const next=await b.lease.acquire();await b.lease.release(next);
  });
 });
 it("rejects stale token and stale CAS",async()=>{
  await fixture(async({create})=>{
   const b=create();await b.initialize(1);
   const token=await b.lease.acquire();
   await expect(b.highWater.advance(1,2,"wrong")).rejects.toMatchObject({code:"XSUS_HIGH_WATER_CONFLICT"});
   await b.highWater.advance(1,2,token);
   await expect(b.highWater.advance(1,3,token)).rejects.toMatchObject({code:"XSUS_HIGH_WATER_CONFLICT"});
   await b.lease.release(token);
  });
 });
 it("detects tampered durable trusted state",async()=>{
  await fixture(async({root,create})=>{
   const b=create();await b.initialize(1);
   const path=join(root,"trusted","state.json");
   const {readFile}=await import("node:fs/promises");
   const state=JSON.parse(await readFile(path,"utf8"));state.mark=99;
   await writeFile(path,JSON.stringify(state));
   await expect(create().highWater.read()).rejects.toMatchObject({code:"XSUS_LOCAL_STATE_SIGNATURE"});
  });
 });
 it("runs end-to-end recovery using durable trusted state and signed files",async()=>{
  await fixture(async({root,create})=>{
   const b=create();await b.initialize(1);
   const build=()=>{
    const provider=create();
    return createAuditRecoveryRuntime({
     anchorDirectory:join(root,"anchors"),receiptDirectory:join(root,"receipts"),
     key:"a".repeat(48),keyId:"anchor-v33",
     highWater:provider.highWater,lease:provider.lease,expected:provider.expected,
     authorize:async()=>true
    });
   };
   const runtime=build();
   await runtime.anchors.rotate(s1);await runtime.anchors.rotate(s2);
   expect(await runtime.recover(s2)).toEqual({sequence:2,status:"reconciled",receipts:1});
   expect(await build().inspect(s2)).toEqual({sequence:2,receipts:1,status:"verified"});
  });
 });
});

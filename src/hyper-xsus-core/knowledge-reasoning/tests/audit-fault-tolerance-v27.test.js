import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,readdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createRotatingAuditAnchors} from "../audit-anchor-rotation.js";
import {createFencedAuditCoordinator} from "../fenced-audit-coordinator.js";
import {createAuditReconciler} from "../audit-reconciler.js";

const key="f".repeat(48),keyId="fault-v27",hash=c=>c.repeat(64);
const snap=(n,entries)=>({version:"0.8.0",anchorHash:"GENESIS",lastSequence:n,entries});
const one=snap(1,[{sequence:1,hash:hash("a")}]);
const two=snap(2,[{sequence:1,hash:hash("a")},{sequence:2,hash:hash("b")}]);
const three=snap(3,[...two.entries,{sequence:3,hash:hash("c")}]);
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-fault-v27-"));
 try{await fn(dir,()=>createRotatingAuditAnchors({directory:dir,key,keyId}));}
 finally{await rm(dir,{recursive:true,force:true});}
}
function backend(mark){
 let committed=mark,owner=null,epoch=0,updates=0;
 const lease={acquire:async()=>{owner=++epoch;return owner;},release:async t=>{if(owner===t)owner=null;}};
 const highWater={read:async()=>committed,advance:async(expected,next,t)=>{
  if(owner!==t||committed!==expected||next<=expected)throw Object.assign(Error("CAS/fence"),{code:"XSUS_HIGH_WATER_CONFLICT"});
  committed=next;updates++;
 }};
 return {lease,highWater,get committed(){return committed;},get updates(){return updates;}};
}
describe("Hyper Audit v2.7 — filesystem failure and restart boundaries",()=>{
 it("rejects truncated checkpoint after restart, without approving recovery",async()=>{
  await fixture(async(dir,factory)=>{
   const store=factory();await store.rotate(one);
   await writeFile(join(dir,"anchor-0000000000000002.json"),'{"version":"1.6.0"',{mode:0o600});
   const fresh=factory(),b=backend(1);let approved=0;
   const r=createAuditReconciler({anchors:fresh,...b,authorize:async()=>{approved++;return true;}});
   await expect(r.reconcile(two)).rejects.toThrow();
   expect(approved).toBe(0);expect(b.committed).toBe(1);
  });
 });
 it("rejects injected file-sync failure and leaves no trusted commit",async()=>{
  await fixture(async(dir,factory)=>{
   const store=factory();await store.rotate(one);
   const b=backend(1);
   const {open}=await import("node:fs/promises");
   const fsOps={open:async(...args)=>{
    const handle=await open(...args);
    if(String(args[0]).endsWith("anchor-0000000000000002.json")){
     return new Proxy(handle,{get(target,prop){
      if(prop==="sync")return async()=>{throw Object.assign(Error("injected fsync"),{code:"EIO"});};
      const value=Reflect.get(target,prop,target);
      return typeof value==="function"?value.bind(target):value;
     }});
    }
    return handle;
   }};
   const faulty=createRotatingAuditAnchors({directory:dir,key,keyId,fsOps});
   const c=createFencedAuditCoordinator({anchors:faulty,...b});
   await expect(c.advance(two)).rejects.toMatchObject({code:"EIO"});
   expect(b.committed).toBe(1);expect(b.updates).toBe(0);
   expect((await readdir(dir)).some(x=>x.includes("0000000000000002"))).toBe(true);
  });
 });
 it("detects durable pending checkpoint after reconstructed instances",async()=>{
  await fixture(async(_dir,factory)=>{
   await factory().rotate(one);await factory().rotate(two);
   const b=backend(1);
   await expect(createFencedAuditCoordinator({anchors:factory(),...b}).inspect(two))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_PENDING"});
   const r=createAuditReconciler({anchors:factory(),...b,authorize:async()=>true});
   expect(await r.reconcile(two)).toEqual({sequence:2,status:"reconciled"});
   expect(await createFencedAuditCoordinator({anchors:factory(),...b}).inspect(two))
    .toEqual({sequence:2,status:"verified"});
  });
 });
 it("denies a stale snapshot during pending recovery after restart",async()=>{
  await fixture(async(_dir,factory)=>{
   await factory().rotate(one);await factory().rotate(two);
   const b=backend(1);
   const r=createAuditReconciler({anchors:factory(),...b,authorize:async()=>true});
   await expect(r.reconcile(one)).rejects.toMatchObject({code:"XSUS_RECONCILE_SNAPSHOT_MISMATCH"});
   expect(b.committed).toBe(1);
  });
 });
 it("reconciles two consecutive durable pending checkpoints only with approval",async()=>{
  await fixture(async(_dir,factory)=>{
   await factory().rotate(one);await factory().rotate(two);
   const b=backend(1);let approvals=0;
   const r=createAuditReconciler({anchors:factory(),...b,authorize:async()=>{approvals++;return true;}});
   await r.reconcile(two);
   await factory().rotate(three);
   await expect(createFencedAuditCoordinator({anchors:factory(),...b}).inspect(three))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_PENDING"});
   await r.reconcile(three);
   expect(b.committed).toBe(3);expect(b.updates).toBe(2);expect(approvals).toBe(2);
  });
 });
});

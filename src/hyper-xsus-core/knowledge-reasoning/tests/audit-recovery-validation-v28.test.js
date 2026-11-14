import {describe,it,expect} from "vitest";
import {mkdtemp,rm,unlink,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createRotatingAuditAnchors} from "../audit-anchor-rotation.js";
import {createFencedAuditCoordinator} from "../fenced-audit-coordinator.js";
import {createAuditReconciler} from "../audit-reconciler.js";

const key="r".repeat(48),keyId="recovery-v28",h=c=>c.repeat(64);
const s1={version:"0.8.0",lastSequence:1,anchorHash:"GENESIS",entries:[{sequence:1,hash:h("a")}]};
const s2={...s1,lastSequence:2,entries:[...s1.entries,{sequence:2,hash:h("b")}]};
const s3={...s1,lastSequence:3,entries:[...s2.entries,{sequence:3,hash:h("c")}]};
const name=n=>`anchor-${String(n).padStart(16,"0")}.json`;
async function fixture(fn){
 const directory=await mkdtemp(join(tmpdir(),"xsus-recovery-v28-"));
 try{await fn(directory,()=>createRotatingAuditAnchors({directory,key,keyId}));}
 finally{await rm(directory,{recursive:true,force:true});}
}
function trusted(initial){
 let mark=initial,owner=null,epoch=0,commits=0;
 const lease={acquire:async()=>{owner=++epoch;return owner;},
  release:async token=>{if(owner===token)owner=null;}};
 const highWater={read:async()=>mark,advance:async(expected,next,token)=>{
  if(owner!==token||mark!==expected||next<=mark)
   throw Object.assign(Error("stale CAS/fence"),{code:"XSUS_HIGH_WATER_CONFLICT"});
  mark=next;commits++;
 }};
 return {lease,highWater,get mark(){return mark;},get commits(){return commits;}};
}
describe("Hyper Audit v2.8 — multi-restart recovery validation",()=>{
 it("repeated restart checks remain verified after an authorized recovery",async()=>{
  await fixture(async(_dir,make)=>{
   await make().rotate(s1);await make().rotate(s2);
   const t=trusted(1);
   for(let i=0;i<10;i++)
    await expect(createFencedAuditCoordinator({anchors:make(),...t}).inspect(s2))
     .rejects.toMatchObject({code:"XSUS_ANCHOR_PENDING"});
   await createAuditReconciler({anchors:make(),...t,authorize:async()=>true}).reconcile(s2);
   for(let i=0;i<10;i++)
    expect(await createFencedAuditCoordinator({anchors:make(),...t}).inspect(s2))
     .toEqual({sequence:2,status:"verified"});
   expect(t.mark).toBe(2);expect(t.commits).toBe(1);
  });
 });
 it("does not accept replay of an already reconciled checkpoint",async()=>{
  await fixture(async(_dir,make)=>{
   await make().rotate(s1);await make().rotate(s2);
   const t=trusted(1),reconciler=createAuditReconciler({anchors:make(),...t,authorize:async()=>true});
   await reconciler.reconcile(s2);
   await expect(reconciler.reconcile(s2)).rejects.toMatchObject({code:"XSUS_RECONCILE_NOT_PENDING"});
   expect(t.commits).toBe(1);
  });
 });
 it("fails closed when trusted mark is ahead of the anchor directory",async()=>{
  await fixture(async(_dir,make)=>{
   await make().rotate(s1);
   const t=trusted(3);
   await expect(createFencedAuditCoordinator({anchors:make(),...t}).inspect(s1))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_DELETION"});
   await expect(createAuditReconciler({anchors:make(),...t,authorize:async()=>true}).reconcile(s1))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_DELETION"});
   expect(t.commits).toBe(0);
  });
 });
 it("blocks recovery when the newest checkpoint is truncated",async()=>{
  await fixture(async(dir,make)=>{
   await make().rotate(s1);await make().rotate(s2);
   await writeFile(join(dir,name(2)),'{"sequence":2',{mode:0o600});
   const t=trusted(1);let approvals=0;
   const r=createAuditReconciler({anchors:make(),...t,authorize:async()=>{approvals++;return true;}});
   await expect(r.reconcile(s2)).rejects.toThrow();
   expect(approvals).toBe(0);expect(t.mark).toBe(1);
  });
 });
 it("detects lost committed checkpoint after a later restart",async()=>{
  await fixture(async(dir,make)=>{
   await make().rotate(s1);await make().rotate(s2);
   const t=trusted(1);
   await createAuditReconciler({anchors:make(),...t,authorize:async()=>true}).reconcile(s2);
   await unlink(join(dir,name(2)));
   await expect(createFencedAuditCoordinator({anchors:make(),...t}).inspect(s2))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_DELETION"});
   expect(t.mark).toBe(2);
  });
 });
 it("requires separate authorization for each new pending checkpoint",async()=>{
  await fixture(async(_dir,make)=>{
   await make().rotate(s1);await make().rotate(s2);
   const t=trusted(1);let approvals=0;
   const reconcile=()=>createAuditReconciler({anchors:make(),...t,authorize:async()=>{approvals++;return true;}});
   await reconcile().reconcile(s2);
   await make().rotate(s3);
   await expect(createFencedAuditCoordinator({anchors:make(),...t}).inspect(s3))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_PENDING"});
   await reconcile().reconcile(s3);
   expect(t.mark).toBe(3);expect(t.commits).toBe(2);expect(approvals).toBe(2);
  });
 });
});

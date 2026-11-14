import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,chmod,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createRotatingAuditAnchors} from "../audit-anchor-rotation.js";
import {createAuditAnchorVerifier} from "../audit-anchor-verifier.js";
import {createFencedAuditCoordinator} from "../fenced-audit-coordinator.js";
import {createAuditReconciler} from "../audit-reconciler.js";

const key="k".repeat(48),otherKey="z".repeat(48),keyId="security-v26";
const hex=x=>x.repeat(64);
const snapshot=(n,hash,previous="GENESIS")=>({
 version:"0.8.0",lastSequence:n,anchorHash:previous,
 entries:[{sequence:n,hash}]
});
async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),"xsus-anchor-security-"));
 try{await run(dir,createRotatingAuditAnchors({directory:dir,key,keyId}));}
 finally{await rm(dir,{recursive:true,force:true});}
}
const file=n=>`anchor-${String(n).padStart(16,"0")}.json`;
async function rewrite(path,transform){
 const obj=JSON.parse(await readFile(path,"utf8"));
 await writeFile(path,JSON.stringify(transform(obj)));
 await chmod(path,0o600);
}
describe("Hyper Audit v2.6 — real signed-anchor security regression",()=>{
 it("rejects signature manipulation of newest checkpoint",async()=>{
  await fixture(async(dir,store)=>{
   const s=snapshot(1,hex("a"));await store.rotate(s);
   await rewrite(join(dir,file(1)),x=>({...x,signature:hex("0")}));
   await expect(store.verify(s)).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_SIGNATURE"});
  });
 });
 it("rejects signed checkpoint from a different secret",async()=>{
  await fixture(async(dir,store)=>{
   const s=snapshot(1,hex("a"));await store.rotate(s);
   const alien=createAuditAnchorVerifier({key:otherKey,keyId}).createAnchor(s);
   await rewrite(join(dir,file(1)),()=>alien);
   await expect(store.verify(s)).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_SIGNATURE"});
  });
 });
 it("rejects replay of a valid older signed checkpoint under newer filename",async()=>{
  await fixture(async(dir,store)=>{
   const s1=snapshot(1,hex("a")),s2=snapshot(2,hex("b"),hex("a"));
   await store.rotate(s1);await store.rotate(s2);
   const old=await readFile(join(dir,file(1)),"utf8");
   await writeFile(join(dir,file(2)),old,{mode:0o600});
   await expect(store.verify(s2)).rejects.toMatchObject({code:"XSUS_ANCHOR_INVALID_FILE"});
  });
 });
 it("detects fork at same signed sequence",async()=>{
  await fixture(async(_dir,store)=>{
   const signed=snapshot(1,hex("a"));await store.rotate(signed);
   await expect(store.verify(snapshot(1,hex("b"))))
    .rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_FORK"});
  });
 });
 it("detects rollback against newer signed checkpoint",async()=>{
  await fixture(async(_dir,store)=>{
   await store.rotate(snapshot(2,hex("b")));
   await expect(store.verify(snapshot(1,hex("a"))))
    .rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_ROLLBACK"});
  });
 });
 it("rejects removal of newest checkpoint when trusted mark is higher",async()=>{
  await fixture(async(dir,store)=>{
   const s1=snapshot(1,hex("a")),s2=snapshot(2,hex("b"),hex("a"));
   await store.rotate(s1);await store.rotate(s2);
   await unlink(join(dir,file(2)));
   const highWater={read:async()=>2,advance:async()=>{throw Error("must not commit");}};
   const lease={acquire:async()=>1,release:async()=>{}};
   await expect(createFencedAuditCoordinator({anchors:store,highWater,lease}).inspect(s2))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_DELETION"});
  });
 });
 it("refuses reconciliation when checkpoint signature is corrupted",async()=>{
  await fixture(async(dir,store)=>{
   const s1=snapshot(1,hex("a")),s2=snapshot(2,hex("b"),hex("a"));
   await store.rotate(s1);await store.rotate(s2);
   await rewrite(join(dir,file(2)),x=>({...x,tipHash:hex("c")}));
   let approvals=0;
   const highWater={read:async()=>1,advance:async()=>{throw Error("must not commit");}};
   const lease={acquire:async()=>1,release:async()=>{}};
   const reconciler=createAuditReconciler({anchors:store,highWater,lease,
    authorize:async()=>{approvals++;return true;}});
   await expect(reconciler.reconcile(s2))
    .rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_SIGNATURE"});
   expect(approvals).toBe(0);
  });
 });
});

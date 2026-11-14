import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createRotatingAuditAnchors} from "../audit-anchor-rotation.js";
const hash=c=>c.repeat(64);
const snap=(n,tip,entries=[{sequence:n,hash:tip}],anchorHash="GENESIS")=>({
 version:"0.8.0",lastSequence:n,anchorHash,entries
});
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-anchor-rotation-v19-"));
 const anchors=join(dir,"external");
 const store=()=>createRotatingAuditAnchors({directory:anchors,key:"k".repeat(48),keyId:"primary"});
 try{await fn({anchors,store});}finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper Audit v1.9.0 — immutable anchor rotation",()=>{
 it("persists successive checkpoints and verifies after restart",async()=>{
  await fixture(async({store})=>{
   const a=snap(1,hash("a")),b=snap(2,hash("b"),[{sequence:1,hash:hash("a")},{sequence:2,hash:hash("b")}]);
   await store().rotate(a);await store().rotate(b);
   expect(await store().list()).toEqual([1,2]);
   expect(await store().verify(b)).toBe(2);
  });
 });
 it("rejects nonmonotonic rotation",async()=>{
  await fixture(async({store})=>{
   const a=snap(1,hash("a"));
   await store().rotate(a);
   await expect(store().rotate(a)).rejects.toMatchObject({code:"XSUS_ANCHOR_NONMONOTONIC"});
  });
 });
 it("detects rollback against newest checkpoint",async()=>{
  await fixture(async({store})=>{
   await store().rotate(snap(2,hash("b")));
   await expect(store().verify(snap(1,hash("a"))))
    .rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_ROLLBACK"});
  });
 });
 it("rejects modified checkpoint after restart",async()=>{
  await fixture(async({store,anchors})=>{
   const a=snap(1,hash("a"));
   await store().rotate(a);
   const [file]=await (await import("node:fs/promises")).readdir(anchors);
   const path=join(anchors,file),data=JSON.parse(await readFile(path,"utf8"));
   data.signature=hash("0");
   await writeFile(path,JSON.stringify(data));
   await expect(store().verify(a)).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_SIGNATURE"});
  });
 });
 it("supports journal retention when newest checkpoint remains observable",async()=>{
  await fixture(async({store})=>{
   await store().rotate(snap(1,hash("a")));
   const b=snap(2,hash("b"),[{sequence:2,hash:hash("b")}],hash("a"));
   await store().rotate(b);
   const c=snap(3,hash("c"),[{sequence:3,hash:hash("c")}],hash("b"));
   expect(await store().verify(c)).toBe(2);
  });
 });
 it("rejects malformed checkpoint names instead of ignoring them",async()=>{
  await fixture(async({store,anchors})=>{
   await (await import("node:fs/promises")).mkdir(anchors);
   await writeFile(join(anchors,"anchor-bad.json"),"{}");
   await expect(store().list()).rejects.toMatchObject({code:"XSUS_ANCHOR_INVALID_FILE"});
  });
 });
 it("fails closed when checkpoint directory is empty",async()=>{
  await fixture(async({store})=>{
   await expect(store().verify(snap(1,hash("a"))))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_MISSING"});
  });
 });
});

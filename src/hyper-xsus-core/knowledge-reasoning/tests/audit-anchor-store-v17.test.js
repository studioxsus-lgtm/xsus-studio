import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile,chmod} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createAuditAnchorStore} from "../audit-anchor-store.js";

const key="k".repeat(48);
const snapshot=(sequence=1,hash="a".repeat(64))=>({
 version:"0.8.0",anchorHash:"GENESIS",lastSequence:sequence,
 entries:sequence?[{sequence,hash}]:[]
});
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-anchor-v17-"));
 try{await fn(join(dir,"anchor.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
const store=filePath=>createAuditAnchorStore({filePath,key,keyId:"key-1"});
describe("Hyper Audit v1.7.0 — external checkpoint persistence",()=>{
 it("persists an anchor and verifies it from a fresh instance",async()=>{
  await fixture(async file=>{
   const first=store(file);
   expect((await first.initialize(snapshot())).sequence).toBe(1);
   expect(await store(file).verify(snapshot())).toBe(true);
  });
 });
 it("refuses to overwrite an existing checkpoint",async()=>{
  await fixture(async file=>{
   await store(file).initialize(snapshot());
   const before=await readFile(file,"utf8");
   await expect(store(file).initialize(snapshot(2,"b".repeat(64))))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_EXISTS"});
   expect(await readFile(file,"utf8")).toBe(before);
  });
 });
 it("fails closed when the checkpoint is missing",async()=>{
  await fixture(async file=>{
   await expect(store(file).verify(snapshot()))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_MISSING"});
  });
 });
 it("rejects a tampered checkpoint signature",async()=>{
  await fixture(async file=>{
   await store(file).initialize(snapshot());
   const data=JSON.parse(await readFile(file,"utf8"));
   data.signature="0".repeat(64);
   await writeFile(file,JSON.stringify(data));
   await expect(store(file).verify(snapshot()))
    .rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_SIGNATURE"});
  });
 });
 it("detects a rollback after restart",async()=>{
  await fixture(async file=>{
   await store(file).initialize(snapshot(2,"b".repeat(64)));
   await expect(store(file).verify(snapshot()))
    .rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_ROLLBACK"});
  });
 });
 it.skipIf(process.platform==="win32")("rejects a group-readable checkpoint",async()=>{
  await fixture(async file=>{
   await store(file).initialize(snapshot());
   await chmod(file,0o644);
   await expect(store(file).verify(snapshot()))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_UNSAFE"});
  });
 });
 it("rejects a substituted symbolic link",async()=>{
  await fixture(async file=>{
   const {symlink}=await import("node:fs/promises");
   const target=file+".target";
   await writeFile(target,"{}");
   await symlink(target,file);
   await expect(store(file).verify(snapshot())).rejects.toThrow();
   expect(await readFile(target,"utf8")).toBe("{}");
  });
 });
});

import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {createAndroidArtifactStore} from "../../services/src/deployment/android-artifact-store.js";
const bytes=Buffer.from("504b03040102","hex");
const artifact={bytes,size:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),status:"verified_debug_apk",signatureVerified:true,applicationIdVerified:true,launcherVerified:true};
async function fixture(fn,options={}){const root=await mkdtemp(join(tmpdir(),"xsus-store-test-"));try{await fn(createAndroidArtifactStore({root,...options}),root);}finally{await rm(root,{recursive:true,force:true});}}
describe("Private Android artifact storage",()=>{
 it("rejects relative storage roots",()=>expect(()=>createAndroidArtifactStore({root:"relative"})).toThrow());
 it("stores verified bytes and isolates owners",()=>fixture(async s=>{const a=await s.put("alice","p",artifact);expect(a).not.toHaveProperty("bytes");expect(await s.get("bob",a.id)).toBeNull();expect((await s.get("alice",a.id)).bytes).toEqual(bytes);}));
 it("rejects unverified signatures",()=>fixture(async s=>{await expect(s.put("alice","p",{...artifact,signatureVerified:false})).rejects.toThrow();}));
 it("rejects mismatched digests",()=>fixture(async s=>{await expect(s.put("alice","p",{...artifact,sha256:"0".repeat(64)})).rejects.toThrow();}));
 it("detects stored file tampering",()=>fixture(async(s,root)=>{const a=await s.put("alice","p",artifact);await writeFile(join(root,a.id,"app.apk"),Buffer.alloc(bytes.length));await expect(s.get("alice",a.id)).rejects.toThrow("integrity");}));
 it("enforces total storage capacity",()=>fixture(async s=>{await s.put("alice","p",artifact);await expect(s.put("bob","p",artifact)).rejects.toThrow("capacity");},{maxBytes:bytes.length}));
 it("expires artifacts and reclaims capacity",async()=>{let time=100;await fixture(async s=>{const a=await s.put("alice","p",artifact);time+=1000;expect(await s.get("alice",a.id)).toBeNull();expect((await s.put("alice","p",artifact)).id).not.toBe(a.id);},{now:()=>time,ttlMs:1000,maxBytes:bytes.length});});
 it("rejects unknown IDs without accessing paths",()=>fixture(async s=>{expect(await s.get("alice","../../etc/passwd")).toBeNull();}));
});

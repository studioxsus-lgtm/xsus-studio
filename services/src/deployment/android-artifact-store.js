import {createHash,randomUUID} from "node:crypto";
import {mkdir,writeFile,readFile,rename,rm} from "node:fs/promises";
import {join,isAbsolute} from "node:path";

// Single-process staging storage. Root must be private and controlled by the server.
export function createAndroidArtifactStore({root,maxBytes=64*1024*1024,ttlMs=900000,now=Date.now}={}){
 if(typeof root!=="string"||!isAbsolute(root)||!Number.isSafeInteger(maxBytes)||maxBytes<4||!Number.isSafeInteger(ttlMs)||ttlMs<1000)throw Error("Invalid artifact store configuration");
 const records=new Map();let reserved=0;
 const digest=b=>createHash("sha256").update(b).digest("hex");
 async function remove(id,r){await rm(join(root,id),{recursive:true,force:true});if(records.get(id)===r){records.delete(id);reserved-=r.size;}}
 async function prune(){for(const [id,r] of records)if(r.ready&&r.expiresAt<=now())await remove(id,r);}
 return Object.freeze({
  async put(owner,projectId,artifact){
   if(typeof owner!=="string"||!owner||typeof projectId!=="string"||!projectId||artifact?.status!=="verified_debug_apk"||artifact.signatureVerified!==true||artifact.applicationIdVerified!==true||artifact.launcherVerified!==true||!Buffer.isBuffer(artifact.bytes)||artifact.bytes.length<4||artifact.bytes.length>maxBytes)throw Error("Invalid verified artifact");
   const bytes=Buffer.from(artifact.bytes),sha256=digest(bytes);
   if(bytes.subarray(0,4).toString("hex")!=="504b0304"||artifact.size!==bytes.length||artifact.sha256!==sha256)throw Error("Artifact integrity failure");
   await prune();
   if(reserved+bytes.length>maxBytes)throw Error("Artifact storage capacity unavailable");
   const id=randomUUID(),r={owner,projectId,size:bytes.length,sha256,ready:false,expiresAt:0};
   records.set(id,r);reserved+=r.size;
   const dir=join(root,id);
   try{
    await mkdir(root,{recursive:true,mode:0o700});await mkdir(dir,{mode:0o700});
    await writeFile(join(dir,"pending"),bytes,{flag:"wx",mode:0o600});
    await rename(join(dir,"pending"),join(dir,"app.apk"));
    r.expiresAt=now()+ttlMs;r.ready=true;
    return {id,projectId,size:r.size,sha256,expiresAt:r.expiresAt,status:"verified_debug_apk",installationVerified:false};
   }catch(e){await remove(id,r);throw e;}
  },
  async get(owner,id){
   await prune();const r=records.get(id);
   if(!r?.ready||r.owner!==owner)return null;
   const bytes=await readFile(join(root,id,"app.apk"));
   if(bytes.length!==r.size||digest(bytes)!==r.sha256)throw Error("Stored artifact integrity failure");
   if(r.expiresAt<=now()||records.get(id)!==r)return null;
   return {bytes,size:r.size,sha256:r.sha256,projectId:r.projectId};
  },
  prune
 });
}

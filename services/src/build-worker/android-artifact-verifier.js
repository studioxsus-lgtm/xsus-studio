import {createHash} from "node:crypto";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,isAbsolute} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const execute=promisify(execFile);

// Trusted Android SDK executables only; never supplied by an HTTP client.
export function createAndroidArtifactVerifier({apksigner,aapt2,run=execute}={}){
 if(typeof apksigner!=="string"||!isAbsolute(apksigner)||typeof aapt2!=="string"||!isAbsolute(aapt2)||typeof run!=="function")throw Error("Invalid verifier configuration");
 return async function verify(artifact,applicationId){
  if(typeof applicationId!=="string"||applicationId.length>150||! /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(applicationId))throw Error("Invalid application ID");
  if(!Buffer.isBuffer(artifact?.bytes)||artifact.bytes.length<4||artifact.bytes.length>128*1024*1024)throw Error("Invalid APK");
  const bytes=Buffer.from(artifact.bytes),sha256=createHash("sha256").update(bytes).digest("hex");
  if(bytes.subarray(0,4).toString("hex")!=="504b0304"||artifact.size!==bytes.length||artifact.sha256!==sha256)throw Error("APK integrity failure");
  const dir=await mkdtemp(join(tmpdir(),"xsus-apk-verify-"));
  try{
   const file=join(dir,"app.apk");
   await writeFile(file,bytes,{flag:"wx",mode:0o600});
   const options={timeout:60000,maxBuffer:1024*1024,encoding:"utf8",windowsHide:true};
   await run(apksigner,["verify",file],options);
   const result=await run(aapt2,["dump","badging",file],options);
   const lines=String(result?.stdout??"").split(/\r?\n/);
   const packages=lines.filter(line=>line.startsWith("package:"));
   if(packages.length!==1||!packages[0].startsWith("package: name='"+applicationId+"'")||!lines.some(line=>/^launchable-activity: name='[^']+'/.test(line)))throw Error("APK identity verification failed");
   return {kind:"apk",variant:"debug",bytes,size:bytes.length,sha256,applicationId,status:"verified_debug_apk",signatureVerified:true,applicationIdVerified:true,launcherVerified:true,installationVerified:false};
  }finally{await rm(dir,{recursive:true,force:true});}
 };
}

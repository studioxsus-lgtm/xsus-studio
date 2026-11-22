import {validateBuildManifest} from "../build/build-manifest.js";
import {constants} from "node:fs";
import {lstat,mkdir,open,rm,realpath} from "node:fs/promises";
import path from "node:path";
export const ARTIFACT_STAGING_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const DEFAULT_ROOT="/var/lib/xsus-sandbox/staging";
async function directoryIsSafe(dir){
  const stat=await lstat(dir);
  if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o022)!==0)throw new Error("Unsafe staging directory permissions");
}
export function createArtifactStaging({root=DEFAULT_ROOT}={}){
  if(root!==DEFAULT_ROOT)throw new TypeError("Staging root must be fixed");
  async function materialize(input,{executionId,signal}={}){
    const manifest=validateBuildManifest(input);
    if(typeof executionId!=="string"||!ID.test(executionId))throw new TypeError("Invalid staging execution ID");
    if(signal?.aborted)throw new Error("Staging cancelled");
    await directoryIsSafe("/var");
    await directoryIsSafe("/var/lib");
    await directoryIsSafe("/var/lib/xsus-sandbox");
    await directoryIsSafe(root);
    if(await realpath(root)!==root)throw new Error("Staging root is not canonical");
    const destination=path.posix.join(root,executionId);
    let created=false;
    try{
      await mkdir(destination,{mode:0o700});
      created=true;
      await directoryIsSafe(destination);
      for(const file of manifest.files){
        if(signal?.aborted)throw new Error("Staging cancelled");
        const parts=file.path.split("/");
        let current=destination;
        for(const segment of parts.slice(0,-1)){
          current=path.posix.join(current,segment);
          try{await mkdir(current,{mode:0o700});}catch(error){if(error?.code!=="EEXIST")throw error;}
          await directoryIsSafe(current);
        }
        const filePath=path.posix.join(destination,...parts);
        const handle=await open(filePath,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
        try{await handle.writeFile(file.content,"utf8");await handle.sync();}finally{await handle.close();}
      }
      await directoryIsSafe(destination);
      return Object.freeze({path:destination,verifiedPermissions:true});
    }catch(error){
      if(created)await rm(destination,{recursive:true,force:true}).catch(()=>{});
      throw error;
    }
  }
  async function removeMaterialized(staged,{executionId}={}){
    if(typeof executionId!=="string"||!ID.test(executionId)||staged?.path!==path.posix.join(root,executionId))throw new TypeError("Invalid staging cleanup identity");
    await directoryIsSafe(root);
    await rm(staged.path,{recursive:true,force:true});
  }
  return Object.freeze({materialize,removeMaterialized});
}

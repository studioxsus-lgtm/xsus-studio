import {validateBuildManifest} from "../build/build-manifest.js";
export const DOCKER_READABLE_STAGING_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const ROOT="/var/lib/xsus-sandbox/staging/";
const RUNTIME_UID=65534;
const RUNTIME_GID=65534;
/**
 * Host-side ownership handoff for read-only Docker bind mounts.
 * The trusted helper must use race-resistant fd-relative operations.
 */
export function createDockerReadableStaging({staging,prepareOwnership,verifyOwnership}={}){
 if(!staging||typeof staging.materialize!=="function"||typeof staging.removeMaterialized!=="function"||typeof prepareOwnership!=="function"||typeof verifyOwnership!=="function")throw new TypeError("Trusted Docker staging dependencies required");
 return Object.freeze({
  async materialize(input,{executionId,signal}={}){
   const manifest=validateBuildManifest(input);
   if(typeof executionId!=="string"||!ID.test(executionId))throw new TypeError("Invalid Docker staging identity");
   if(signal?.aborted)throw new Error("Docker staging cancelled");
   const staged=await staging.materialize(manifest,{executionId,signal});
   if(staged?.path!==ROOT+executionId||staged.verifiedPermissions!==true)throw new Error("Untrusted staged artifact");
   try{
    await prepareOwnership({path:staged.path,manifest,executionId,uid:RUNTIME_UID,gid:RUNTIME_GID,signal});
    if(signal?.aborted)throw new Error("Docker staging cancelled");
    const verified=await verifyOwnership({path:staged.path,manifest,executionId,uid:RUNTIME_UID,gid:RUNTIME_GID,signal});
    if(verified!==true)throw new Error("Docker staging UID ownership not verified");
    return Object.freeze({path:staged.path,verifiedPermissions:true,containerUid:RUNTIME_UID,containerGid:RUNTIME_GID});
   }catch(error){
    try{await staging.removeMaterialized(staged,{executionId});}
    catch(cleanupError){throw new AggregateError([error,cleanupError],"Docker staging handoff and cleanup failed");}
    throw error;
   }
  },
  async removeMaterialized(staged,{executionId}={}){
   if(staged?.path!==ROOT+executionId||staged.containerUid!==RUNTIME_UID||staged.containerGid!==RUNTIME_GID||typeof executionId!=="string"||!ID.test(executionId))throw new TypeError("Invalid Docker staging cleanup identity");
   return staging.removeMaterialized(staged,{executionId});
  }
 });
}

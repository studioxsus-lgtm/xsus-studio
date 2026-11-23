import {validateBuildManifest} from "../build/build-manifest.js";
export const XSUS_APP_BUILD_BRIDGE_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
/**
 * An opt-in backend boundary between XSUS App's generated files and the
 * isolated build runtime. No browser access to Docker credentials.
 */
export function createXsusAppBuildBridge({authorize,generateProject,runtime,recordResult}={}){
 if(typeof authorize!=="function"||typeof generateProject!=="function"||!runtime||typeof runtime.execute!=="function"||typeof recordResult!=="function")throw new TypeError("Trusted XSUS App build dependencies required");
 return Object.freeze({
  async build({ownerId,projectId,executionId,operationId,prompt,policy,signal}={}){
   if(![ownerId,projectId,executionId,operationId].every(x=>typeof x==="string"&&ID.test(x))||typeof prompt!=="string"||!prompt.trim()||prompt.length>4000)throw new TypeError("Invalid XSUS App build request");
   if(signal?.aborted)throw new Error("Build cancelled before authorization");
   if(await authorize({ownerId,projectId,executionId,operationId,action:"application.build"})!==true)throw new Error("XSUS App build unauthorized");
   if(signal?.aborted)throw new Error("Build cancelled before generation");
   const generated=await generateProject({ownerId,projectId,prompt,signal});
   const manifest=validateBuildManifest(generated);
   if(signal?.aborted)throw new Error("Build cancelled before runtime");
   let outcome,error=null;
   try{
    outcome=await runtime.execute({executionId,operationId,manifest,policy,signal});
    if(!outcome||typeof outcome.success!=="boolean"||!Array.isArray(outcome.diagnostics))throw new TypeError("Invalid runtime outcome");
   }catch(cause){error=cause;}
   let receiptError=null;
   try{await recordResult({ownerId,projectId,executionId,operationId,status:error?"uncertain":outcome.success?"succeeded":"failed"});}
   catch(cause){receiptError=cause;}
   if(error&&receiptError)throw new AggregateError([error,receiptError],"Runtime and build receipt persistence failed");
   if(error)throw error;
   if(receiptError)throw receiptError;
   return Object.freeze({projectId,executionId,operationId,status:outcome.success?"succeeded":"failed",diagnostics:outcome.diagnostics});
  }
 });
}

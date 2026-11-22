import {validateBuildManifest} from "../build/build-manifest.js";
import {createSandboxPolicy} from "./sandbox-policy.js";
export const TRUSTED_RUNTIME_ADAPTER_VERSION="0.1.0";
const HEX=/^[a-f0-9]{64}$/i;
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
export function createTrustedRuntimeAdapter({provider,digest,verifyAttestation,policy={}}={}){
  if(!provider||typeof provider.execute!=="function")throw new TypeError("Isolated runtime provider required");
  if(typeof digest!=="function")throw new TypeError("Trusted digest implementation required");
  if(typeof verifyAttestation!=="function")throw new TypeError("Trusted attestation verifier required");
  const limits=createSandboxPolicy(policy);
  return Object.freeze({
    policy:limits,
    async run(input,{signal,executionId}={}){
      const manifest=validateBuildManifest(input);
      if(typeof executionId!=="string"||!ID.test(executionId))throw new TypeError("Valid execution ID required");
      if(signal?.aborted)throw new Error("Runtime cancelled");
      const canonical=JSON.stringify({project:manifest.project,files:manifest.files.map(f=>[f.path,f.content])});
      const artifactDigest=await digest(canonical);
      if(typeof artifactDigest!=="string"||!HEX.test(artifactDigest))throw new TypeError("Invalid artifact digest");
      if(signal?.aborted)throw new Error("Runtime cancelled");
      const response=await provider.execute({manifest,policy:limits,executionId,artifactDigest:artifactDigest.toLowerCase(),signal});
      if(signal?.aborted)throw new Error("Runtime cancelled");
      if(!response||typeof response!=="object"||typeof response.success!=="boolean"||!Array.isArray(response.diagnostics)||response.diagnostics.length>100)throw new TypeError("Invalid runtime response");
      const diagnostics=response.diagnostics.map(item=>{
        if(!item||!["info","warning","error"].includes(item.level)||typeof item.message!=="string"||item.message.length>2000)throw new TypeError("Invalid runtime diagnostic");
        return Object.freeze({level:item.level,message:item.message});
      });
      const expected=Object.freeze({executionId,project:manifest.project,artifactDigest:artifactDigest.toLowerCase(),policy:limits});
      // The verifier must authenticate provenance and bind the attestation to every expected field.
      // Never infer isolation from a provider-supplied boolean.
      const verified=response.attestation!=null&&await verifyAttestation(response.attestation,expected)===true;
      const verifiedIsolation=Boolean(verified);
      return Object.freeze({version:TRUSTED_RUNTIME_ADAPTER_VERSION,project:manifest.project,success:response.success&&verifiedIsolation,verifiedIsolation,diagnostics:Object.freeze(diagnostics),policy:limits,productionApproved:false});
    }
  });
}

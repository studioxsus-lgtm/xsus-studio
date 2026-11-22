import {validateBuildManifest} from "../build/build-manifest.js";
import {createSandboxPolicy} from "./sandbox-policy.js";
export const REMOTE_SANDBOX_PROVIDER_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const DIGEST=/^[a-f0-9]{64}$/i;
export function createRemoteSandboxProvider({transport,endpoint,allowedOrigin}={}){
  if(typeof transport!=="function")throw new TypeError("Authenticated transport required");
  if(typeof endpoint!=="string"||typeof allowedOrigin!=="string")throw new TypeError("Pinned sandbox endpoint and origin required");
  let url,origin;
  try{url=new URL(endpoint);origin=new URL(allowedOrigin);}catch{throw new TypeError("Invalid sandbox endpoint");}
  if(url.protocol!=="https:"||origin.protocol!=="https:"||url.origin!==origin.origin||origin.pathname!=="/"||origin.search||origin.hash||url.username||url.password||url.hash)throw new TypeError("Sandbox endpoint must use pinned HTTPS origin");
  const fixedEndpoint=url.href;
  return Object.freeze({
    async execute({manifest,policy,executionId,artifactDigest,signal}={}){
      const artifact=validateBuildManifest(manifest);
      const limits=createSandboxPolicy(policy);
      if(typeof executionId!=="string"||!ID.test(executionId))throw new TypeError("Invalid execution ID");
      if(typeof artifactDigest!=="string"||!DIGEST.test(artifactDigest))throw new TypeError("Invalid artifact digest");
      if(signal?.aborted)throw new Error("Sandbox request cancelled");
      // The injected transport must enforce authentication, timeouts, response size and redirect policy.
      const result=await transport(Object.freeze({endpoint:fixedEndpoint,method:"POST",body:Object.freeze({version:REMOTE_SANDBOX_PROVIDER_VERSION,manifest:artifact,policy:limits,executionId,artifactDigest:artifactDigest.toLowerCase()}),signal}));
      if(signal?.aborted)throw new Error("Sandbox request cancelled");
      if(!result||typeof result!=="object"||typeof result.success!=="boolean"||!Array.isArray(result.diagnostics)||result.diagnostics.length>100)throw new TypeError("Invalid sandbox response");
      const diagnostics=result.diagnostics.map(item=>{
        if(!item||!["info","warning","error"].includes(item.level)||typeof item.message!=="string"||item.message.length>2000)throw new TypeError("Invalid sandbox diagnostic");
        return Object.freeze({level:item.level,message:item.message});
      });
      // Do not trust or synthesize attestation; it is validated separately by the trusted runtime adapter.
      return Object.freeze({success:result.success,diagnostics:Object.freeze(diagnostics),attestation:result.attestation??null});
    }
  });
}

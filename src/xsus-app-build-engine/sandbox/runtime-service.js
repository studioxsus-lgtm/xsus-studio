import {validateBuildManifest} from "../build/build-manifest.js";
import {createSandboxPolicy} from "./sandbox-policy.js";
export const RUNTIME_SERVICE_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const DIGEST=/^[a-f0-9]{64}$/i;
const POLICY_KEYS=new Set(["version","timeoutMs","memoryMb","cpuMs","maxOutputBytes","network","filesystem","privileged"]);
function normalizePolicy(input){
  if(!input||typeof input!=="object"||Array.isArray(input))throw new TypeError("Invalid sandbox policy");
  for(const key of Object.keys(input))if(!POLICY_KEYS.has(key))throw new TypeError("Unsupported sandbox policy option");
  if(Object.hasOwn(input,"version")&&input.version!=="0.1.0")throw new TypeError("Unsupported sandbox policy version");
  if(Object.hasOwn(input,"network")&&input.network!=="disabled")throw new TypeError("Network must remain disabled");
  if(Object.hasOwn(input,"filesystem")&&input.filesystem!=="ephemeral")throw new TypeError("Filesystem must remain ephemeral");
  if(Object.hasOwn(input,"privileged")&&input.privileged!==false)throw new TypeError("Privileged execution prohibited");
  return createSandboxPolicy({timeoutMs:input.timeoutMs,memoryMb:input.memoryMb,cpuMs:input.cpuMs,maxOutputBytes:input.maxOutputBytes});
}
export function createRuntimeService({authorize,executor,hash,verifyExecutionProof}={}){
  if(typeof authorize!=="function")throw new TypeError("Server authorization required");
  if(!executor||typeof executor.runIsolated!=="function")throw new TypeError("Isolated executor required");
  if(typeof hash!=="function")throw new TypeError("Trusted digest required");
  if(typeof verifyExecutionProof!=="function")throw new TypeError("Execution proof verifier required");
  return Object.freeze({
    async execute(request,{credential,signal}={}){
      if(signal?.aborted)throw new Error("Execution cancelled");
      if(!request||request.version!=="0.1.0"||typeof request!=="object")throw new TypeError("Unsupported runtime request");
      if(typeof request.executionId!=="string"||!ID.test(request.executionId))throw new TypeError("Invalid execution ID");
      if(typeof request.artifactDigest!=="string"||!DIGEST.test(request.artifactDigest))throw new TypeError("Invalid artifact digest");
      const manifest=validateBuildManifest(request.manifest);
      const policy=normalizePolicy(request.policy);
      const permitted=await authorize({credential,executionId:request.executionId,project:manifest.project});
      if(permitted!==true)throw new Error("Runtime authorization denied");
      if(signal?.aborted)throw new Error("Execution cancelled");
      const canonical=JSON.stringify({project:manifest.project,files:manifest.files.map(f=>[f.path,f.content])});
      const computed=await hash(canonical);
      if(typeof computed!=="string"||!DIGEST.test(computed)||computed.toLowerCase()!==request.artifactDigest.toLowerCase())throw new Error("Artifact integrity verification failed");
      if(signal?.aborted)throw new Error("Execution cancelled");
      const result=await executor.runIsolated({manifest,policy,executionId:request.executionId,signal});
      if(signal?.aborted)throw new Error("Execution cancelled");
      if(!result||typeof result.success!=="boolean"||!Array.isArray(result.diagnostics)||result.diagnostics.length>100)throw new TypeError("Invalid executor result");
      const diagnostics=result.diagnostics.map(d=>{
        if(!d||!["info","warning","error"].includes(d.level)||typeof d.message!=="string"||d.message.length>2000)throw new TypeError("Invalid executor diagnostic");
        return Object.freeze({level:d.level,message:d.message});
      });
      const expected=Object.freeze({executionId:request.executionId,project:manifest.project,artifactDigest:computed.toLowerCase(),policy});
      const attested=result.proof!=null&&await verifyExecutionProof(result.proof,expected)===true;
      if(!attested)throw new Error("Execution isolation proof unverified");
      return Object.freeze({success:result.success&&!diagnostics.some(d=>d.level==="error"),diagnostics:Object.freeze(diagnostics),attestation:result.proof,productionApproved:false});
    }
  });
}

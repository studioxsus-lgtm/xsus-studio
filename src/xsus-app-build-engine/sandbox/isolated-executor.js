import {validateBuildManifest} from "../build/build-manifest.js";
import {createSandboxPolicy} from "./sandbox-policy.js";
export const ISOLATED_EXECUTOR_VERSION="0.1.0";
const IMAGE=/^[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}$/;
const EXECUTION_ID=/^[a-zA-Z0-9_-]{8,128}$/;
function validatePolicy(policy){
  if(!policy||typeof policy!=="object"||Array.isArray(policy))throw new TypeError("Invalid sandbox policy");
  const allowed=new Set(["version","timeoutMs","memoryMb","cpuMs","maxOutputBytes","network","filesystem","privileged"]);
  for(const key of Object.keys(policy))if(!allowed.has(key))throw new TypeError("Unsupported sandbox policy option");
  if(Object.hasOwn(policy,"version")&&policy.version!=="0.1.0")throw new TypeError("Unsupported sandbox policy version");
  if(Object.hasOwn(policy,"network")&&policy.network!=="disabled")throw new TypeError("Network must remain disabled");
  if(Object.hasOwn(policy,"filesystem")&&policy.filesystem!=="ephemeral")throw new TypeError("Filesystem must remain ephemeral");
  if(Object.hasOwn(policy,"privileged")&&policy.privileged!==false)throw new TypeError("Privileged execution prohibited");
  return createSandboxPolicy({timeoutMs:policy.timeoutMs,memoryMb:policy.memoryMb,cpuMs:policy.cpuMs,maxOutputBytes:policy.maxOutputBytes});
}
export function createIsolatedExecutor({driver,image,verifyHostIsolation}={}){
  if(!driver||typeof driver.run!=="function")throw new TypeError("Isolated container driver required");
  if(typeof image!=="string"||!IMAGE.test(image))throw new TypeError("Digest-pinned runtime image required");
  if(typeof verifyHostIsolation!=="function")throw new TypeError("Host isolation verifier required");
  return Object.freeze({
    async runIsolated({manifest,policy,executionId,signal}={}){
      const artifact=validateBuildManifest(manifest);
      const limits=validatePolicy(policy);
      if(typeof executionId!=="string"||!EXECUTION_ID.test(executionId))throw new TypeError("Invalid execution ID");
      if(signal?.aborted)throw new Error("Execution cancelled");
      // Host verification must check rootless operation, cgroups, seccomp, mount and network isolation.
      const hostVerified=await verifyHostIsolation({image,policy:limits,executionId});
      if(hostVerified!==true)throw new Error("Host isolation unverified");
      if(signal?.aborted)throw new Error("Execution cancelled");
      const specification=Object.freeze({
        image,executionId,manifest:artifact,policy:limits,
        network:"none",readOnlyRootfs:true,privileged:false,
        noNewPrivileges:true,dropCapabilities:"ALL",user:"65534:65534",
        memoryBytes:limits.memoryMb*1024*1024,
        pidsLimit:32,cpus:1,timeoutMs:limits.timeoutMs,
        outputLimitBytes:limits.maxOutputBytes,
        writableTmpfs:Object.freeze({path:"/tmp",sizeBytes:16*1024*1024,noexec:true,nosuid:true,nodev:true})
      });
      // The driver must enforce all fields, kill on timeout/cancellation and remove the container.
      const result=await driver.run(specification,{signal});
      if(signal?.aborted)throw new Error("Execution cancelled");
      if(!result||typeof result.success!=="boolean"||!Array.isArray(result.diagnostics)||result.diagnostics.length>100)throw new TypeError("Invalid isolated executor result");
      const diagnostics=result.diagnostics.map(d=>{
        if(!d||!["info","warning","error"].includes(d.level)||typeof d.message!=="string"||d.message.length>2000)throw new TypeError("Invalid executor diagnostic");
        return Object.freeze({level:d.level,message:d.message});
      });
      // Proof must be created and authenticated by the trusted runtime; never synthesize it.
      return Object.freeze({success:result.success,diagnostics:Object.freeze(diagnostics),proof:result.proof??null});
    }
  });
}

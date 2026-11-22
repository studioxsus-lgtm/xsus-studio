export const DOCKER_CONTAINER_DRIVER_VERSION="0.1.0";
const IMAGE=/^[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}$/;
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
export function createDockerContainerDriver({runProcess,materialize,removeMaterialized}={}){
  if(typeof runProcess!=="function")throw new TypeError("Trusted process runner required");
  if(typeof materialize!=="function"||typeof removeMaterialized!=="function")throw new TypeError("Secure artifact staging and cleanup required");
  return Object.freeze({
    async run(spec,{signal}={}){
      if(!spec||typeof spec!=="object"||!IMAGE.test(spec.image)||!ID.test(spec.executionId))throw new TypeError("Invalid container specification");
      if(spec.network!=="none"||spec.readOnlyRootfs!==true||spec.privileged!==false||spec.noNewPrivileges!==true||spec.dropCapabilities!=="ALL"||spec.user!=="65534:65534")throw new TypeError("Unsafe container specification");
      if(!Number.isSafeInteger(spec.memoryBytes)||spec.memoryBytes<1||spec.memoryBytes>256*1024*1024||spec.pidsLimit!==32||spec.cpus!==1)throw new TypeError("Invalid container resource limits");
      if(!Number.isSafeInteger(spec.timeoutMs)||spec.timeoutMs<1||spec.timeoutMs>30000||!Number.isSafeInteger(spec.outputLimitBytes)||spec.outputLimitBytes<1||spec.outputLimitBytes>65536)throw new TypeError("Invalid execution limits");
      if(!spec.writableTmpfs||spec.writableTmpfs.path!=="/tmp"||spec.writableTmpfs.noexec!==true||spec.writableTmpfs.nosuid!==true||spec.writableTmpfs.nodev!==true||spec.writableTmpfs.sizeBytes!==16777216)throw new TypeError("Invalid temporary filesystem");
      if(signal?.aborted)throw new Error("Execution cancelled");
      const staged=await materialize(spec.manifest,{executionId:spec.executionId,signal});
      if(!staged||typeof staged.path!=="string"||!/^\/var\/lib\/xsus-sandbox\/staging\/[a-zA-Z0-9_-]{8,128}$/.test(staged.path)||staged.verifiedPermissions!==true)throw new TypeError("Secure staging verification failed");
      const name="xsus-"+spec.executionId;
      const args=["run","--rm","--name",name,"--network","none","--read-only","--user",spec.user,"--cap-drop","ALL","--security-opt","no-new-privileges","--pids-limit",String(spec.pidsLimit),"--memory",String(spec.memoryBytes),"--cpus",String(spec.cpus),"--tmpfs","/tmp:rw,noexec,nosuid,nodev,size=16777216","--mount",`type=bind,source=${staged.path},target=/workspace,readonly`,"--workdir","/workspace",spec.image];
      try{
        if(signal?.aborted)throw new Error("Execution cancelled");
        const result=await runProcess("docker",args,{signal,timeoutMs:spec.timeoutMs,maxOutputBytes:spec.outputLimitBytes,killContainerName:name});
        if(!result||typeof result.exitCode!=="number"||!Number.isSafeInteger(result.exitCode))throw new TypeError("Invalid container process result");
        return Object.freeze({success:result.exitCode===0,diagnostics:Object.freeze(result.exitCode===0?[]:[Object.freeze({level:"error",message:"Isolated process exited unsuccessfully"})]),proof:null});
      }finally{
        await removeMaterialized(staged,{executionId:spec.executionId});
      }
    }
  });
}

export const SECURE_PROCESS_RUNNER_VERSION="0.1.0";
const NAME=/^xsus-[a-zA-Z0-9_-]{8,128}$/;
export function createSecureProcessRunner({spawn,terminateContainer}={}){
  if(typeof spawn!=="function")throw new TypeError("Trusted process spawner required");
  if(typeof terminateContainer!=="function")throw new TypeError("Container cleanup provider required");
  return async function runProcess(binary,args,{signal,timeoutMs,maxOutputBytes,killContainerName}={}){
    if(binary!=="docker"||!Array.isArray(args)||args[0]!=="run"||args.some(a=>typeof a!=="string"||a.length>1024||/[\r\n\0]/.test(a)))throw new TypeError("Invalid Docker invocation");
    if(!NAME.test(killContainerName)||args[args.indexOf("--name")+1]!==killContainerName)throw new TypeError("Container identity mismatch");
    if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||!Number.isSafeInteger(maxOutputBytes)||maxOutputBytes<1||maxOutputBytes>65536)throw new RangeError("Invalid process limits");
    if(signal?.aborted)throw new Error("Execution cancelled");
    let child,timeout,finished=false,aborted=false,outputBytes=0;
    const onAbort=()=>{aborted=true;try{child?.kill("SIGKILL");}catch{}};
    signal?.addEventListener?.("abort",onAbort,{once:true});
    try{
      child=spawn(binary,args,{shell:false,stdio:["ignore","pipe","pipe"],env:{PATH:"/usr/bin:/bin"},windowsHide:true});
      if(!child||typeof child.on!=="function"||typeof child.kill!=="function"||!child.stdout?.on||!child.stderr?.on)throw new TypeError("Invalid process handle");
      if(signal?.aborted)onAbort();
      const result=await new Promise((resolve,reject)=>{
        let settled=false;
        const fail=error=>{if(!settled){settled=true;reject(error);}};
        const succeed=exitCode=>{if(!settled){settled=true;resolve({exitCode});}};
        const consume=chunk=>{
          outputBytes+=typeof chunk==="string"?Buffer.byteLength(chunk):chunk?.byteLength??0;
          if(outputBytes>maxOutputBytes){aborted=true;try{child.kill("SIGKILL");}catch{}}
        };
        child.stdout.on("data",consume);
        child.stderr.on("data",consume);
        child.on("error",fail);
        child.on("close",(code)=>{finished=true;if(aborted)fail(new Error("Process cancelled, timed out or exceeded output limit"));else if(!Number.isSafeInteger(code))fail(new Error("Process terminated without exit code"));else succeed(code);});
        timeout=setTimeout(()=>{aborted=true;try{child.kill("SIGKILL");}catch{}},timeoutMs);
      });
      return Object.freeze(result);
    }finally{
      if(timeout!==undefined)clearTimeout(timeout);
      signal?.removeEventListener?.("abort",onAbort);
      if(!finished){try{child?.kill("SIGKILL");}catch{}}
      // Independent daemon-side cleanup is mandatory even if the local process exits.
      await terminateContainer(killContainerName);
    }
  };
}

export const BUILD_WORKER_CONNECTIVITY_VERSION="0.1.0";
/** Server-side only; token must never be sent to the browser. */
export function createBuildWorkerConnectivity({workerUrl,sharedSecret,fetchImpl=fetch}={}){
 if(typeof workerUrl!=="string"||!/^https:\/\/[a-z0-9.-]+\.onrender\.com\/?$/.test(workerUrl)||typeof sharedSecret!=="string"||sharedSecret.length<32||typeof fetchImpl!=="function")throw new TypeError("Trusted worker connection configuration required");
 const endpoint=workerUrl.replace(/\/$/,"")+"/internal/connectivity";
 return Object.freeze({
  async check(){
   try{
    const response=await fetchImpl(endpoint,{method:"POST",headers:{authorization:"Bearer "+sharedSecret,accept:"application/json"},signal:AbortSignal.timeout(8000),redirect:"error"});
    if(!response.ok)return Object.freeze({connected:false});
    const data=await response.json();
    return Object.freeze({connected:data?.ok===true&&data?.service==="xsus-app-build-worker",buildEnabled:false});
   }catch{return Object.freeze({connected:false});}
  }
 });
}

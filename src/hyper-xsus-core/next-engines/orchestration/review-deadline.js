import {EngineContractError,object} from "../contracts.js";
import {createReviewResourceGuard} from "./resource-guard.js";

/**
 * Review-only deadline admission. A timeout rejects the caller, but does not
 * cancel a write already in progress. Capacity remains reserved until the
 * underlying persistence operation actually settles.
 */
export function createReviewDeadline({timeoutMs=30000,maxInFlight=8,maxRequestBytes=65536}={}) {
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1)
    throw new EngineContractError("INVALID_INPUT","timeoutMs must be a positive safe integer");
  const guard=createReviewResourceGuard({maxInFlight,maxRequestBytes});
  let timedOut=0;
  let cancelled=0;
  function run(input,store,{signal}={}){
    if(signal!==undefined){
      object(signal,"signal");
      if(typeof signal.aborted!=="boolean"||typeof signal.addEventListener!=="function"||
         typeof signal.removeEventListener!=="function")
        throw new EngineContractError("INVALID_INPUT","signal must be an AbortSignal");
    }
    if(signal?.aborted){
      cancelled++;
      return Promise.reject(new EngineContractError("REQUEST_CANCELLED","Request cancelled before admission"));
    }
    // The guarded operation is started once, with no retries.
    // Never release the guard's capacity when only the caller stops waiting.
    let timer;
    let onAbort;
    let settled=false;
    const operation=guard.run(input,store);
    const deadline=new Promise((_,reject)=>{
      timer=setTimeout(()=>{
        if(settled)return;
        timedOut++;
        reject(new EngineContractError("REQUEST_TIMEOUT","Review deadline exceeded; persistence may still be in progress"));
      },timeoutMs);
      if(signal){
        onAbort=()=>{
          if(settled)return;
          cancelled++;
          reject(new EngineContractError("REQUEST_CANCELLED","Request cancelled; persistence may still be in progress"));
        };
        signal.addEventListener("abort",onAbort,{once:true});
        if(signal.aborted)onAbort();
      }
    });
    return Promise.race([operation,deadline]).finally(()=>{
      settled=true;
      clearTimeout(timer);
      if(signal&&onAbort)signal.removeEventListener("abort",onAbort);
    });
  }
  function metrics(){return Object.freeze({...guard.metrics(),timedOut,cancelled,timeoutMs});}
  return Object.freeze({run,metrics});
}

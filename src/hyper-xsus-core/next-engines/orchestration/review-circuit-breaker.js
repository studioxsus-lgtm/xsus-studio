import {EngineContractError} from "../contracts.js";

/**
 * Local review-only circuit breaker. Only unexpected operational failures
 * count toward opening. No retries, dispatch or execution authorization.
 * Epoch fencing prevents stale in-flight completions changing a newer state.
 */
const EXPECTED_CODES=new Set([
 "INVALID_INPUT","UNSUPPORTED_VERSION","ENGINE_MISMATCH","UNSUPPORTED_OPERATION",
 "REQUEST_CANCELLED","REQUEST_TIMEOUT","CAPACITY_EXCEEDED","REQUEST_TOO_LARGE",
 "INPUT_TOO_LARGE","CIRCUIT_OPEN","JOURNAL_CONFLICT","UNSAFE_PAYLOAD",
 "DUPLICATE_EVIDENCE","DUPLICATE_STEP","UNKNOWN_DEPENDENCY","CYCLIC_DEPENDENCY"
]);
export function createReviewCircuitBreaker({failureThreshold=3,cooldownMs=30000,clock=Date.now}={}) {
 if(!Number.isSafeInteger(failureThreshold)||failureThreshold<1||
    !Number.isSafeInteger(cooldownMs)||cooldownMs<1||typeof clock!=="function")
   throw new EngineContractError("INVALID_INPUT","Invalid circuit breaker configuration");
 let state="closed",failures=0,openedAt=null,probeInFlight=false,epoch=0;
 let accepted=0,rejected=0,ignoredFailures=0;
 const now=()=>{
  const value=clock();
  if(!Number.isFinite(value)||value<0)
   throw new EngineContractError("INVALID_INPUT","Invalid circuit breaker clock");
  return value;
 };
 async function run(operation){
  if(typeof operation!=="function")
   throw new EngineContractError("INVALID_INPUT","operation must be a function");
  const time=now();
  if(state==="open"&&time-openedAt>=cooldownMs){
   state="half_open";epoch++;
  }
  if(state==="open"||(state==="half_open"&&probeInFlight)){
   rejected++;
   throw new EngineContractError("CIRCUIT_OPEN","Review circuit is unavailable");
  }
  const probe=state==="half_open",admittedEpoch=epoch;
  if(probe)probeInFlight=true;
  accepted++;
  try{
   const value=await operation();
   if(admittedEpoch===epoch){
    if(probe){state="closed";failures=0;openedAt=null;epoch++;}
    else if(state==="closed"&&failures>0){failures=0;epoch++;}
   }
   return value;
  }catch(error){
   if(admittedEpoch===epoch){
    if(EXPECTED_CODES.has(error?.code)){
     ignoredFailures++;
     if(probe){state="closed";failures=0;openedAt=null;epoch++;}
    }else if(probe){
     state="open";openedAt=now();failures=failureThreshold;epoch++;
    }else if(state==="closed"){
     failures=Math.min(failureThreshold,failures+1);
     if(failures>=failureThreshold){state="open";openedAt=now();epoch++;}
    }
   }
   throw error;
  }finally{
   if(probe)probeInFlight=false;
  }
 }
 function metrics(){
  return Object.freeze({state,failures,openedAt,probeInFlight,accepted,rejected,
   ignoredFailures,failureThreshold,cooldownMs,executionAuthorized:false});
 }
 return Object.freeze({run,metrics});
}

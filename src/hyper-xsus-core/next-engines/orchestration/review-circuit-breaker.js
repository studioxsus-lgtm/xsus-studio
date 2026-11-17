import {EngineContractError,object} from "../contracts.js";

/**
 * Local circuit breaker for review-only operations.
 * No retries, dispatch, persistence, or execution authorization.
 * Only thrown/rejected operations count as failures.
 */
export function createReviewCircuitBreaker({failureThreshold=3,cooldownMs=30000,clock=Date.now}={}) {
  if(!Number.isSafeInteger(failureThreshold)||failureThreshold<1||
     !Number.isSafeInteger(cooldownMs)||cooldownMs<1||typeof clock!=="function")
    throw new EngineContractError("INVALID_INPUT","Invalid circuit breaker configuration");
  let state="closed",failures=0,openedAt=null,probeInFlight=false;
  let accepted=0,rejected=0;
  const now=()=>{
    const value=clock();
    if(!Number.isFinite(value)||value<0)throw new EngineContractError("INVALID_INPUT","Invalid circuit breaker clock");
    return value;
  };
  async function run(operation){
    if(typeof operation!=="function")
      throw new EngineContractError("INVALID_INPUT","operation must be a function");
    const time=now();
    if(state==="open"&&time-openedAt>=cooldownMs)state="half_open";
    if(state==="open"||(state==="half_open"&&probeInFlight)){
      rejected++;
      throw new EngineContractError("CIRCUIT_OPEN","Review circuit is unavailable");
    }
    const probe=state==="half_open";
    if(probe)probeInFlight=true;
    accepted++;
    try{
      const value=await operation();
      if(probe){state="closed";failures=0;openedAt=null;}
      else if(state==="closed")failures=0;
      return value;
    }catch(error){
      if(probe){
        state="open";openedAt=now();failures=failureThreshold;
      }else if(state==="closed"){
        failures=Math.min(failureThreshold,failures+1);
        if(failures>=failureThreshold){state="open";openedAt=now();}
      }
      throw error;
    }finally{
      if(probe)probeInFlight=false;
    }
  }
  function metrics(){
    return Object.freeze({state,failures,openedAt,probeInFlight,accepted,rejected,failureThreshold,cooldownMs,
      executionAuthorized:false});
  }
  return Object.freeze({run,metrics});
}

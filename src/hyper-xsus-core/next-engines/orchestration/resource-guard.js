import {byteLength} from "node:buffer";
import {EngineContractError,object} from "../contracts.js";
import {coordinateAndRecord} from "./review-pipeline.js";

/**
 * Local, in-process admission guard. Does not authorize actions, dispatch agents,
 * impose distributed limits, or bound CPU usage inside synchronous engine calls.
 */
export function createReviewResourceGuard({maxRequestBytes=65536,maxInFlight=8}={}) {
  if(!Number.isSafeInteger(maxRequestBytes)||maxRequestBytes<1||
     !Number.isSafeInteger(maxInFlight)||maxInFlight<1)
    throw new EngineContractError("INVALID_INPUT","Resource limits must be positive safe integers");
  let inFlight=0;
  let accepted=0;
  let rejected=0;
  function inspect(input){
    object(input,"request");
    let serialized;
    try{serialized=JSON.stringify(input);}
    catch{rejected++;throw new EngineContractError("INVALID_INPUT","Request is not JSON serializable");}
    if(typeof serialized!=="string"){
      rejected++;throw new EngineContractError("INVALID_INPUT","Request is not JSON serializable");
    }
    const bytes=byteLength(serialized,"utf8");
    if(bytes>maxRequestBytes){
      rejected++;throw new EngineContractError("REQUEST_TOO_LARGE","Request exceeds byte limit");
    }
    return {bytes};
  }
  async function run(input,store){
    inspect(input);
    if(inFlight>=maxInFlight){
      rejected++;throw new EngineContractError("CAPACITY_EXCEEDED","Review pipeline at capacity");
    }
    inFlight++;
    accepted++;
    try{return await coordinateAndRecord(input,store);}
    finally{inFlight--;}
  }
  function metrics(){return Object.freeze({inFlight,accepted,rejected,maxInFlight,maxRequestBytes});}
  return Object.freeze({run,inspect,metrics});
}

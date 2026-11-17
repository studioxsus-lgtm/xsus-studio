import {Buffer} from "node:buffer";
import {EngineContractError,object} from "../contracts.js";
import {coordinateSixEngines} from "./index.js";

const STAGES=new Set(["truth","learning","planning","execution","improvement","agents"]);
const FORBIDDEN=new Set(["__proto__","prototype","constructor"]);
const invalid=()=>new EngineContractError("INVALID_INPUT","Invalid trust-boundary input");

/**
 * Opt-in review-only boundary: validate and copy untrusted orchestration input.
 * Never forwards references to caller-owned mutable payloads.
 * Does not authorize actions or perform I/O.
 */
export function createReviewTrustBoundary({maxBytes=65536,maxDepth=16,maxNodes=4096}={}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||
    !Number.isSafeInteger(maxDepth)||maxDepth<1||
    !Number.isSafeInteger(maxNodes)||maxNodes<1)throw invalid();
 function isolate(input){
  object(input,"input");
   const seen=new WeakSet();
  let nodes=0;
  function copy(value,depth){
   if(depth>maxDepth||++nodes>maxNodes)throw invalid();
   if(value===null||typeof value==="string"||typeof value==="boolean")return value;
   if(typeof value==="number"&&Number.isFinite(value))return value;
   if(typeof value!=="object"||seen.has(value))throw invalid();
   if(Object.getPrototypeOf(value)!==Object.prototype&&
      Object.getPrototypeOf(value)!==null&&!Array.isArray(value))throw invalid();
   seen.add(value);
   const result=Array.isArray(value)?[]:Object.create(null);
   for(const key of Object.keys(value)){
    if(FORBIDDEN.has(key))throw invalid();
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor||!("value" in descriptor))throw invalid();
    result[key]=copy(descriptor.value,depth+1);
   }
   return result;
  }
  const isolated=copy(input,0);
  const bytes=Buffer.byteLength(JSON.stringify(isolated),"utf8");
  if(bytes>maxBytes)throw new EngineContractError("REQUEST_TOO_LARGE","Trust boundary byte limit exceeded");
  const inputs=object(object(isolated.payload,"payload").inputs,"inputs");
  if(Object.keys(inputs).some(name=>!STAGES.has(name)))throw invalid();
  return isolated;
 }
 function coordinate(input){
  const isolated=isolate(input);
  const response=coordinateSixEngines(isolated);
  if(response.result?.authorizedForExecution!==false||
     response.result?.sideEffects!==false)
    throw new EngineContractError("UNSAFE_REVIEW","Review boundary rejected unsafe output");
  return response;
 }
 return Object.freeze({isolate,coordinate});
}

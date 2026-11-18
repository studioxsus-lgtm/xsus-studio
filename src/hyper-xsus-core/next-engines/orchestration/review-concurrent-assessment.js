import {EngineContractError,string} from "../contracts.js";
import {assessReviewRecovery} from "./review-recovery-assessment.js";

/**
 * Phase 46 — bounded, independent read-only recovery assessments.
 * A request's failure never becomes another request's approval.
 * Concurrent filesystem observations are NOT an atomic snapshot.
 */
export async function assessConcurrentReviewRecovery({filePath,store,requests,maxRequests=16,maxConcurrent=4}={}){
 string(filePath,"filePath");
 if(!store||typeof store.load!=="function")
  throw new EngineContractError("INVALID_INPUT","store.load is required");
 if(!Array.isArray(requests)||requests.length===0||
    !Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>64||
    requests.length>maxRequests||
    !Number.isSafeInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>16)
  throw new EngineContractError("INVALID_INPUT","Invalid recovery assessment batch");
 const normalized=requests.map((request)=>{
  if(!request||typeof request!=="object"||Array.isArray(request))
   throw new EngineContractError("INVALID_INPUT","Invalid recovery request");
  string(request.requestId,"requestId");
  string(request.traceId,"traceId");
  if(request.timeoutMs!==undefined&&(!Number.isSafeInteger(request.timeoutMs)||
     request.timeoutMs<1||request.timeoutMs>60000))
   throw new EngineContractError("INVALID_INPUT","timeoutMs must be between 1 and 60000");
  return {requestId:request.requestId,traceId:request.traceId,
   signal:request.signal,timeoutMs:request.timeoutMs};
 });
 const interrupted=()=>Object.freeze({state:"review_blocked",
  lockState:"unverified",journalState:"unverified",
  errorCode:"ASSESSMENT_INTERRUPTED",recoveryAuthorized:false,
  deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
  sideEffects:false,nextAction:"manual_investigation"});
 // Workers claim distinct indices synchronously; at most maxConcurrent
 // assessments can be in flight. Results retain original request order.
 const settled=new Array(normalized.length);
 let cursor=0;
 const worker=async()=>{
  while(cursor<normalized.length){
   const index=cursor++;
   try{
    // Skip queued cancellations before any filesystem or store access.
    // Already-running assessments remain responsible for their own signal.
    if(normalized[index].signal?.aborted===true){
     settled[index]={status:"fulfilled",value:interrupted()};
     continue;
    }
    const request=normalized[index];
    if(request.timeoutMs===undefined){
     const value=await assessReviewRecovery({...request,filePath,store});
     settled[index]={status:"fulfilled",value};
    }else{
     const controller=new AbortController();
     const onAbort=()=>controller.abort();
     let timer;
     try{
      if(request.signal!==undefined){
       if(typeof request.signal?.addEventListener!=="function"||
          typeof request.signal?.aborted!=="boolean")
        throw new EngineContractError("INVALID_INPUT","Invalid AbortSignal");
       request.signal.addEventListener("abort",onAbort,{once:true});
       if(request.signal.aborted)controller.abort();
      }
      if(!controller.signal.aborted)
       timer=setTimeout(()=>controller.abort(),request.timeoutMs);
      // Wait for the underlying read to settle; timeout does not cancel I/O.
      const value=await assessReviewRecovery({...request,filePath,
       signal:controller.signal,store});
      settled[index]={status:"fulfilled",value};
     }finally{
      if(timer!==undefined)clearTimeout(timer);
      request.signal?.removeEventListener?.("abort",onAbort);
     }
    }
   }catch(reason){settled[index]={status:"rejected",reason};}
  }
 };
 await Promise.all(Array.from({length:Math.min(maxConcurrent,normalized.length)},()=>worker()));
 const results=settled.map((item,index)=>{
  const assessment=item.status==="fulfilled"?item.value:Object.freeze({
   state:"review_blocked",lockState:"unverified",journalState:"unverified",
   errorCode:"ASSESSMENT_UNVERIFIED",recoveryAuthorized:false,
   deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
   sideEffects:false,nextAction:"manual_investigation"
  });
  // Always emit the request identity from the caller, never from the journal.
  return Object.freeze({requestId:normalized[index].requestId,
   traceId:normalized[index].traceId,assessment});
 });
 return Object.freeze({state:"manual_review_only",executionAuthorized:false,
  retrySafe:false,sideEffects:false,results:Object.freeze(results)});
}

export const CONTROLLED_EXECUTION_CANCELLATION_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
/**
 * A cooperative cancellation coordinator. A timeout is an uncertainty boundary,
 * not proof that the underlying host operation has stopped.
 */
export function createControlledExecutionCancellation({requestStop,recordUncertain,schedule=setTimeout,cancel=clearTimeout}={}){
 if(typeof requestStop!=="function"||typeof recordUncertain!=="function"||typeof schedule!=="function"||typeof cancel!=="function")throw new TypeError("Trusted cancellation dependencies required");
 return Object.freeze({
  async execute({executionId,operationId,run,signal,timeoutMs=30000}={}){
   if(typeof executionId!=="string"||!ID.test(executionId)||typeof operationId!=="string"||!ID.test(operationId)||typeof run!=="function"||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw new TypeError("Invalid cancellation request");
   if(signal?.aborted)throw new Error("Execution cancelled before start");
   const controller=new AbortController();
   let timer,abortReason=null,stopPromise=null,finished=false;
   const abort=(reason)=>{
    if(finished||abortReason)return;
    abortReason=reason;controller.abort();
    stopPromise=Promise.resolve().then(()=>requestStop({executionId,operationId,reason})).then(()=>({ok:true}),error=>({ok:false,error}));
   };
   const onAbort=()=>abort("external-cancellation");
   signal?.addEventListener?.("abort",onAbort,{once:true});
   let result,runError=null;
   try{
    timer=schedule(()=>abort("timeout"),timeoutMs);
    if(signal?.aborted)abort("external-cancellation");
    // The run promise is deliberately awaited: a cancellation request does not
    // establish that the physical operation has terminated.
    result=await run({signal:controller.signal});
   }catch(error){runError=error;}
   finally{
    finished=true;
    if(timer!==undefined)cancel(timer);
    signal?.removeEventListener?.("abort",onAbort);
   }
   if(abortReason){
    const stop=await stopPromise;
    let receiptError=null;
    try{await recordUncertain({executionId,operationId,reason:abortReason,stopRequested:stop.ok});}
    catch(error){receiptError=error;}
    const causes=[new Error("Execution outcome uncertain after "+abortReason)];
    if(runError)causes.push(runError);
    if(!stop.ok)causes.push(stop.error);
    if(receiptError)causes.push(receiptError);
    throw new AggregateError(causes,"Execution cancelled; physical outcome requires reconciliation");
   }
   if(runError)throw runError;
   return result;
  }
 });
}

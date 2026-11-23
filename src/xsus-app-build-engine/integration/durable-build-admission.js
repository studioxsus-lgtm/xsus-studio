export const DURABLE_BUILD_ADMISSION_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
/**
 * Durable admission boundary: requires a trusted atomic claim before any
 * build work. A rejected/uncertain claim MUST NOT execute or be retried here.
 */
export function createDurableBuildAdmission({engine,claimOperation,recordTerminal}={}){
 if(!engine||typeof engine.build!=="function"||typeof claimOperation!=="function"||typeof recordTerminal!=="function")throw new TypeError("Durable build admission dependencies required");
 return Object.freeze({
  async build(request){
   if(!request||typeof request!=="object"||![request.ownerId,request.projectId,request.executionId,request.operationId].every(v=>typeof v==="string"&&ID.test(v)))throw new TypeError("Invalid durable build identity");
   if(request.signal?.aborted)throw new Error("Build admission cancelled");
   const identity={ownerId:request.ownerId,projectId:request.projectId,executionId:request.executionId,operationId:request.operationId};
   // claimOperation must atomically persist the operation identity and reject
   // replays across hosts. The injected implementation is trusted.
   const claim=await claimOperation(identity);
   if(!claim||claim.accepted!==true||typeof claim.fence!=="string"||!claim.fence)throw new Error("Durable build operation not admitted");
   let outcome,executionError;
   try{
    if(request.signal?.aborted)throw new Error("Build cancelled after durable admission");
    outcome=await engine.build(request);
   }catch(error){executionError=error;}
   let terminalError;
   try{await recordTerminal({...identity,fence:claim.fence,status:executionError?"uncertain":outcome.status});}
   catch(error){terminalError=error;}
   if(executionError&&terminalError)throw new AggregateError([executionError,terminalError],"Build execution and durable terminal recording failed");
   if(terminalError)throw terminalError;
   if(executionError)throw executionError;
   return outcome;
  }
 });
}

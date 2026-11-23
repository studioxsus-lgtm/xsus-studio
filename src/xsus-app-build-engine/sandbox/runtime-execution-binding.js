export const RUNTIME_EXECUTION_BINDING_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
/**
 * Backend-only lifecycle/runtime coordinator.
 * A trusted authorization provider must bind ownerId to the caller, not a browser claim.
 * Do not reuse an execution ID for retries: an ambiguous runtime outcome remains failed.
 */
export function createRuntimeExecutionBinding({lifecycle,executor,authorize,verifyCleanup}={}){
 if(!lifecycle||typeof lifecycle.register!=="function"||typeof lifecycle.start!=="function"||typeof lifecycle.complete!=="function"||typeof lifecycle.fail!=="function"||typeof lifecycle.inspect!=="function")throw new TypeError("Trusted execution lifecycle required");
 if(!executor||typeof executor.runIsolated!=="function"||typeof authorize!=="function"||typeof verifyCleanup!=="function")throw new TypeError("Trusted runtime, authorization and cleanup verification required");
 return Object.freeze({
  async execute({executionId,ownerId,manifest,policy,signal}={}){
   if(typeof executionId!=="string"||!ID.test(executionId)||typeof ownerId!=="string"||!ID.test(ownerId))throw new TypeError("Invalid execution identity");
   if(signal?.aborted)throw new Error("Execution cancelled before registration");
   if(await authorize({executionId,ownerId,operation:"execute"})!==true)throw new Error("Execution authorization denied");
   // Registration and genesis audit are atomic. No execution is started on failure.
   const registered=await lifecycle.register({executionId,ownerId});
   const running=await lifecycle.start(executionId,ownerId,registered.execution);
   let result,runError=null;
   try{
    result=await executor.runIsolated({executionId,manifest,policy,signal});
    if(!result||typeof result.success!=="boolean"||!Array.isArray(result.diagnostics))throw new TypeError("Invalid runtime result");
   }catch(error){runError=error;}
   // Never mark completed on a cancelled, failed, or ambiguous execution.
   const succeeded=!runError&&result.success===true&&!signal?.aborted;
   let terminal;
   try{
    terminal=await (succeeded?lifecycle.complete:lifecycle.fail)(executionId,ownerId,running.execution);
   }catch(transitionError){
    // State reconciliation must be performed by a trusted supervisor before any retry.
    throw new AggregateError(runError?[runError,transitionError]:[transitionError],"Execution outcome could not be durably recorded");
   }
   if(runError)throw new AggregateError([runError],"Runtime failed; failure state recorded");
   if(signal?.aborted)throw new Error("Execution cancelled; failure state recorded");
   return Object.freeze({execution:terminal.execution,audit:terminal.audit,result:Object.freeze({...result}),completed:succeeded});
  },
  async inspect({executionId,ownerId}={}){
   if(typeof executionId!=="string"||!ID.test(executionId)||typeof ownerId!=="string"||!ID.test(ownerId))throw new TypeError("Invalid execution identity");
   if(await authorize({executionId,ownerId,operation:"inspect"})!==true)throw new Error("Inspection authorization denied");
   return lifecycle.inspect(executionId,ownerId);
  },
  async confirmCleanup({executionId,ownerId,current,receipt}={}){
   if(typeof executionId!=="string"||!ID.test(executionId)||typeof ownerId!=="string"||!ID.test(ownerId))throw new TypeError("Invalid execution identity");
   if(await authorize({executionId,ownerId,operation:"cleanup"})!==true)throw new Error("Cleanup authorization denied");
   if(!current||current.executionId!==executionId||current.ownerId!==ownerId||current.state!=="recovering")throw new Error("Recovery state required");
   // Cleanup must be independently verified against host resources and the current fence.
   if(await verifyCleanup({executionId,ownerId,revision:current.revision,fence:current.fence,receipt})!==true)throw new Error("Cleanup evidence unverified");
   if(typeof lifecycle.markCleaned!=="function")throw new TypeError("Cleanup lifecycle transition unavailable");
   return lifecycle.markCleaned(executionId,ownerId,current);
  }
 });
}

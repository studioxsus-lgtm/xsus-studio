export const DURABLE_CANCELLATION_RECOVERY_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const REASONS=new Set(["timeout","external-cancellation","lock-lost","process-failure"]);
function validId(x){return typeof x==="string"&&ID.test(x);}
function validate(x){if(!x||!validId(x.executionId)||!validId(x.operationId)||!REASONS.has(x.reason)||typeof x.stopRequested!=="boolean"||!["uncertain","reviewed"].includes(x.status)||!Number.isSafeInteger(x.revision)||x.revision<1)throw new TypeError("Invalid cancellation receipt");}
export function createDurableCancellationRecovery({store,authorizeReview}={}){
 if(!store||typeof store.read!=="function"||typeof store.createIfAbsent!=="function"||typeof store.compareAndSwap!=="function"||typeof authorizeReview!=="function")throw new TypeError("Trusted cancellation recovery dependencies required");
 return Object.freeze({
  async recordUncertain({executionId,operationId,reason,stopRequested}={}){
   const receipt={executionId,operationId,reason,stopRequested,status:"uncertain",revision:1};validate(receipt);
   const existing=await store.read(executionId,operationId);
   if(existing!==null){validate(existing);if(existing.executionId!==executionId||existing.operationId!==operationId||existing.reason!==reason||existing.stopRequested!==stopRequested)throw new Error("Cancellation receipt identity conflict");return Object.freeze({...existing});}
   if(await store.createIfAbsent(receipt)!==true)throw new Error("Concurrent cancellation receipt registration; inspect before retry");
   return Object.freeze({...receipt});
  },
  async inspect({executionId,operationId}={}){
   if(!validId(executionId)||!validId(operationId))throw new TypeError("Invalid cancellation receipt identity");
   const receipt=await store.read(executionId,operationId);
   if(receipt!==null){validate(receipt);if(receipt.executionId!==executionId||receipt.operationId!==operationId)throw new Error("Cancellation receipt identity mismatch");}
   return receipt===null?null:Object.freeze({...receipt});
  },
  async markReviewed({executionId,operationId,reviewerId,evidenceId}={}){
   if(!validId(executionId)||!validId(operationId)||!validId(reviewerId)||!validId(evidenceId))throw new TypeError("Invalid recovery review identity");
   if(await authorizeReview({executionId,operationId,reviewerId,evidenceId})!==true)throw new Error("Recovery review unauthorized");
   const current=await store.read(executionId,operationId);
   if(current===null)throw new Error("Cancellation receipt not found");
   validate(current);
   if(current.executionId!==executionId||current.operationId!==operationId||current.status!=="uncertain")throw new Error("Cancellation receipt not reviewable");
   const next={...current,status:"reviewed",revision:current.revision+1,reviewerId,evidenceId};
   if(!Number.isSafeInteger(next.revision)||await store.compareAndSwap(current,next)!==true)throw new Error("Concurrent recovery review conflict");
   return Object.freeze({...next});
  }
 });
}

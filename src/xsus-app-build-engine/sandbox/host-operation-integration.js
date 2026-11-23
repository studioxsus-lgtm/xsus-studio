import {createTrustedHostAgent} from "./trusted-host-agent.js";
import {createDurableHostOperationLedger} from "./durable-host-operation-ledger.js";
export const HOST_OPERATION_INTEGRATION_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const OPS=new Set(["launch","stop","cleanup"]);
const validId=x=>typeof x==="string"&&ID.test(x);
/**
 * The ledger owns the single cross-process lock; the host agent executes
 * inside it, so its lock adapter is deliberately a pass-through.
 */
export function createHostOperationIntegration({store,withExclusiveExecutionLock,readFence,writeFence,performAction,writeReceipt,authorize}={}){
 if(typeof authorize!=="function")throw new TypeError("Trusted authorization required");
 const ledger=createDurableHostOperationLedger({store,withExclusiveExecutionLock});
 const agent=createTrustedHostAgent({
  withExclusiveExecutionLock:async(_executionId,callback)=>callback(),
  readFence,writeFence,performAction,writeReceipt
 });
 return Object.freeze({
  async apply({executionId,operationId,ownerId,holderId,fence,operation,payload,signal}={}){
   if(!validId(executionId)||!validId(operationId)||!validId(ownerId)||!validId(holderId)||!Number.isSafeInteger(fence)||fence<1||!OPS.has(operation))throw new TypeError("Invalid integrated host operation");
   if(signal?.aborted)throw new Error("Host operation cancelled");
   if(await authorize({executionId,operationId,ownerId,holderId,fence,operation})!==true)throw new Error("Host operation unauthorized");
   if(signal?.aborted)throw new Error("Host operation cancelled");
   const outcome=await ledger.execute({
    executionId,operationId,holderId,fence,operation,
    performAction:async()=>{
     const receipt=await agent.applyFencedAction({executionId,holderId,fence,operation,payload,signal});
     if(receipt.applied!==true||receipt.accepted!==true)throw new Error("Host receipt unconfirmed");
     return {applied:true};
    }
   });
   if(signal?.aborted)throw new Error("Host operation outcome ambiguous after cancellation");
   return Object.freeze({...outcome,operation,holderId});
  },
  inspect:args=>ledger.inspect(args)
 });
}

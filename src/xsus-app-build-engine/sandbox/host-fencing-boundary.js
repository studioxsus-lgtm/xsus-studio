export const HOST_FENCING_BOUNDARY_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const OPERATIONS=new Set(["launch","stop","cleanup"]);
function validId(value){return typeof value==="string"&&ID.test(value);}
function validFence(value){return Number.isSafeInteger(value)&&value>=1;}
/**
 * Trusted host agent interface. The agent MUST atomically compare its authoritative
 * fencing state and apply the host action, rejecting stale tokens at the action boundary.
 * A separate database read followed by an action is NOT sufficient.
 */
export function createHostFencingBoundary({agent,authorize}={}){
 if(!agent||typeof agent.applyFencedAction!=="function"||typeof authorize!=="function")throw new TypeError("Trusted host fencing dependencies required");
 return Object.freeze({
  async apply({executionId,ownerId,holderId,fence,operation,payload,signal}={}){
   if(!validId(executionId)||!validId(ownerId)||!validId(holderId)||!validFence(fence)||!OPERATIONS.has(operation))throw new TypeError("Invalid fenced host request");
   if(signal?.aborted)throw new Error("Host operation cancelled");
   if(await authorize({executionId,ownerId,holderId,fence,operation})!==true)throw new Error("Host operation unauthorized");
   if(signal?.aborted)throw new Error("Host operation cancelled");
   const result=await agent.applyFencedAction(Object.freeze({executionId,holderId,fence,operation,payload,signal}));
   if(!result||typeof result!=="object"||typeof result.accepted!=="boolean"||typeof result.applied!=="boolean"||typeof result.reason!=="string"||result.reason.length>128)throw new TypeError("Invalid fenced host response");
   if(result.accepted!==true||result.applied!==true)throw new Error("Host action rejected or not applied");
   if(result.executionId!==executionId||result.holderId!==holderId||result.fence!==fence||result.operation!==operation)throw new Error("Host action identity mismatch");
   if(signal?.aborted)throw new Error("Host action outcome ambiguous after cancellation");
   return Object.freeze({executionId,holderId,fence,operation,applied:true,reason:result.reason});
  }
 });
}

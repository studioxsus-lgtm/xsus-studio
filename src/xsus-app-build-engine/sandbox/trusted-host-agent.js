export const TRUSTED_HOST_AGENT_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const OPS=new Set(["launch","stop","cleanup"]);
function id(v){return typeof v==="string"&&ID.test(v);}
function fence(v){return Number.isSafeInteger(v)&&v>0;}
/**
 * Host-side contract: withExclusiveExecutionLock MUST serialize across processes
 * and hold the lock through the physical action and durable receipt write.
 * This module is not itself a daemon or a durable locking implementation.
 */
export function createTrustedHostAgent({withExclusiveExecutionLock,readFence,writeFence,performAction,writeReceipt}={}){
 if([withExclusiveExecutionLock,readFence,writeFence,performAction,writeReceipt].some(fn=>typeof fn!=="function"))throw new TypeError("Trusted host agent dependencies required");
 return Object.freeze({
  async applyFencedAction({executionId,holderId,fence:token,operation,payload,signal}={}){
   if(!id(executionId)||!id(holderId)||!fence(token)||!OPS.has(operation))throw new TypeError("Invalid host action identity");
   if(signal?.aborted)throw new Error("Host action cancelled");
   return withExclusiveExecutionLock(executionId,async()=>{
    if(signal?.aborted)throw new Error("Host action cancelled");
    const prior=await readFence(executionId);
    if(prior!==null&&(!Number.isSafeInteger(prior)||prior<1))throw new Error("Invalid durable host fence");
    if(prior!==null&&token<prior)throw new Error("Stale host fencing token");
    // Fencing state is persisted before the action to reject older holders.
    // This does not establish lease validity: caller must supply a trusted authority.
    if(prior===null||token>prior)await writeFence(executionId,token,prior);
    if(signal?.aborted)throw new Error("Host action cancelled");
    const result=await performAction({executionId,holderId,fence:token,operation,payload,signal});
    if(!result||result.applied!==true)throw new Error("Host action unconfirmed");
    const receipt={executionId,holderId,fence:token,operation,applied:true};
    await writeReceipt(receipt);
    if(signal?.aborted)throw new Error("Host action outcome ambiguous after cancellation");
    return Object.freeze({...receipt,accepted:true,reason:"host-action-recorded"});
   });
  }
 });
}

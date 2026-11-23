export const DURABLE_HOST_OPERATION_LEDGER_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const OPERATIONS=new Set(["launch","stop","cleanup"]);
function validId(value){return typeof value==="string"&&ID.test(value);}
function validFence(value){return Number.isSafeInteger(value)&&value>0;}
function validate(entry){
 if(!entry||!validId(entry.executionId)||!validId(entry.operationId)||!validId(entry.holderId)||!validFence(entry.fence)||!OPERATIONS.has(entry.operation)||!["pending","applied","uncertain"].includes(entry.status))throw new TypeError("Invalid operation ledger record");
}
export function createDurableHostOperationLedger({store,withExclusiveExecutionLock}={}){
 if(!store||typeof store.read!=="function"||typeof store.createIfAbsent!=="function"||typeof store.compareAndSwap!=="function"||typeof withExclusiveExecutionLock!=="function")throw new TypeError("Trusted durable operation ledger dependencies required");
 return Object.freeze({
  async execute({executionId,operationId,holderId,fence,operation,performAction}={}){
   if(!validId(executionId)||!validId(operationId)||!validId(holderId)||!validFence(fence)||!OPERATIONS.has(operation)||typeof performAction!=="function")throw new TypeError("Invalid host operation request");
   return withExclusiveExecutionLock(executionId,async()=>{
    const existing=await store.read(executionId,operationId);
    if(existing!==null){
     validate(existing);
     if(existing.executionId!==executionId||existing.operationId!==operationId||existing.holderId!==holderId||existing.fence!==fence||existing.operation!==operation)throw new Error("Operation identity conflict");
     // An already applied action is never executed twice. Pending/uncertain requires reconciliation.
     if(existing.status==="applied")return Object.freeze({status:"already-applied",executionId,operationId,fence});
     throw new Error("Host operation outcome uncertain; reconciliation required");
    }
    const pending=Object.freeze({executionId,operationId,holderId,fence,operation,status:"pending"});
    if(await store.createIfAbsent(pending)!==true)throw new Error("Concurrent host operation registration");
    let result;
    try{
     result=await performAction({executionId,operationId,holderId,fence,operation});
     if(!result||result.applied!==true)throw new Error("Physical host action unconfirmed");
    }catch(error){
     // Failure may have occurred after a physical side effect. Never auto-retry.
     try{await store.compareAndSwap(pending,Object.freeze({...pending,status:"uncertain"}));}
     catch(markError){throw new AggregateError([error,markError],"Host action and uncertainty persistence failed");}
     throw error;
    }
    const applied=Object.freeze({...pending,status:"applied"});
    if(await store.compareAndSwap(pending,applied)!==true)throw new Error("Host action applied but durable acknowledgement failed; reconciliation required");
    return Object.freeze({status:"applied",executionId,operationId,fence});
   });
  },
  async inspect({executionId,operationId}={}){
   if(!validId(executionId)||!validId(operationId))throw new TypeError("Invalid operation identity");
   const record=await store.read(executionId,operationId);
   if(record!==null){validate(record);if(record.executionId!==executionId||record.operationId!==operationId)throw new Error("Operation identity mismatch");}
   return record;
  }
 });
}

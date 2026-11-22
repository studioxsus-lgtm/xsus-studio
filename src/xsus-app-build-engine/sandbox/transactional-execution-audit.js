export const TRANSACTIONAL_EXECUTION_AUDIT_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const HEX=/^[a-f0-9]{64}$/;
const STATES=new Set(["registered","running","completed","failed","recovering","cleaned"]);
const NEXT={registered:["running","failed"],running:["completed","failed"],completed:["recovering"],failed:["recovering"],recovering:["cleaned","failed"],cleaned:[]};
const ZERO="0".repeat(64);
const AUDIT_VERSION="0.1.0";
function checkRecord(r){
 if(!r||!ID.test(r.executionId)||!ID.test(r.ownerId)||!STATES.has(r.state)||!Number.isSafeInteger(r.revision)||r.revision<1||!Number.isSafeInteger(r.fence)||r.fence<1)throw new Error("Invalid stored execution");
}
export function createTransactionalExecutionAudit({transaction,digest,clock=()=>Date.now()}={}){
 if(typeof transaction!=="function"||typeof digest!=="function"||typeof clock!=="function")throw new TypeError("Transactional audit dependencies required");
 return Object.freeze({
  async transition({executionId,ownerId,expectedRevision,expectedFence,to}={}){
   if(typeof executionId!=="string"||!ID.test(executionId)||typeof ownerId!=="string"||!ID.test(ownerId)||!STATES.has(to)||!Number.isSafeInteger(expectedRevision)||expectedRevision<1||!Number.isSafeInteger(expectedFence)||expectedFence<1)throw new TypeError("Invalid transition request");
   return transaction(async tx=>{
    if(!tx||typeof tx.lockExecution!=="function"||typeof tx.readAuditHead!=="function"||typeof tx.updateExecution!=="function"||typeof tx.appendAudit!=="function")throw new TypeError("Invalid transactional adapter");
    // lockExecution must acquire a database row lock until commit/rollback.
    const current=await tx.lockExecution(executionId);
    checkRecord(current);
    if(current.executionId!==executionId||current.ownerId!==ownerId)throw new Error("Execution ownership mismatch");
    if(current.revision!==expectedRevision||current.fence!==expectedFence)throw new Error("Stale execution revision or fence");
    if(!NEXT[current.state].includes(to))throw new Error("Invalid execution transition");
    const head=await tx.readAuditHead(executionId);
    if(!head||!Number.isSafeInteger(head.sequence)||head.sequence!==current.revision||head.fence!==current.fence||head.to!==current.state||typeof head.hash!=="string"||!HEX.test(head.hash))throw new Error("Audit head does not match execution");
    const timestamp=clock();
    if(!Number.isSafeInteger(timestamp)||timestamp<0)throw new TypeError("Invalid audit clock");
    const next=Object.freeze({...current,state:to,revision:current.revision+1,fence:current.fence+1,updatedAt:timestamp});
    const event={version:AUDIT_VERSION,executionId,sequence:next.revision,revision:next.revision,fence:next.fence,from:current.state,to,timestamp,previousHash:head.hash};
    const hash=await digest(JSON.stringify([event.version,event.executionId,event.sequence,event.revision,event.fence,event.from,event.to,event.timestamp,event.previousHash]));
    if(typeof hash!=="string"||!HEX.test(hash))throw new TypeError("Invalid audit digest");
    const entry=Object.freeze({...event,hash});
    if(await tx.updateExecution(current,next)!==true)throw new Error("Concurrent execution update");
    if(await tx.appendAudit(entry,head.hash)!==true)throw new Error("Concurrent audit append");
    // The adapter MUST roll back both writes on any failure.
    return Object.freeze({execution:next,audit:entry});
   });
  }
 });
}

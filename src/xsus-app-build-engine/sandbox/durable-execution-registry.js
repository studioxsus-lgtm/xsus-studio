export const DURABLE_EXECUTION_REGISTRY_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const OWNER=/^[a-zA-Z0-9_-]{8,128}$/;
const STATES=new Set(["registered","running","completed","failed","recovering","cleaned"]);
const NEXT=Object.freeze({registered:["running","failed"],running:["completed","failed"],completed:["recovering"],failed:["recovering"],recovering:["cleaned","failed"],cleaned:[]});
function validRecord(r){
  return r&&typeof r==="object"&&ID.test(r.executionId)&&OWNER.test(r.ownerId)&&STATES.has(r.state)&&Number.isSafeInteger(r.revision)&&r.revision>=1&&Number.isSafeInteger(r.fence)&&r.fence>=1;
}
export function createDurableExecutionRegistry({store,clock=()=>Date.now()}={}){
  if(!store||typeof store.createIfAbsent!=="function"||typeof store.read!=="function"||typeof store.compareAndSwap!=="function")throw new TypeError("Durable atomic store required");
  if(typeof clock!=="function")throw new TypeError("Clock required");
  const now=()=>{const value=clock();if(!Number.isSafeInteger(value)||value<0)throw new TypeError("Invalid clock");return value;};
  return Object.freeze({
    async register({executionId,ownerId}={}){
      if(typeof executionId!=="string"||!ID.test(executionId)||typeof ownerId!=="string"||!OWNER.test(ownerId))throw new TypeError("Invalid execution identity");
      const record=Object.freeze({executionId,ownerId,state:"registered",revision:1,fence:1,updatedAt:now()});
      if(await store.createIfAbsent(executionId,record)!==true)throw new Error("Execution already registered");
      return record;
    },
    async get(executionId,{ownerId}={}){
      if(typeof executionId!=="string"||!ID.test(executionId)||typeof ownerId!=="string"||!OWNER.test(ownerId))throw new TypeError("Invalid execution identity");
      const record=await store.read(executionId);
      if(!validRecord(record)||record.executionId!==executionId||record.ownerId!==ownerId)throw new Error("Execution unavailable");
      return Object.freeze({...record});
    },
    async transition(executionId,{ownerId,expectedRevision,expectedFence,to}={}){
      const current=await this.get(executionId,{ownerId});
      if(!Number.isSafeInteger(expectedRevision)||!Number.isSafeInteger(expectedFence)||current.revision!==expectedRevision||current.fence!==expectedFence)throw new Error("Stale execution revision or fence");
      if(!NEXT[current.state].includes(to))throw new Error("Invalid execution state transition");
      const updated=Object.freeze({...current,state:to,revision:current.revision+1,fence:current.fence+1,updatedAt:now()});
      if(await store.compareAndSwap(executionId,current.revision,current.fence,updated)!==true)throw new Error("Concurrent execution update");
      return updated;
    },
    async authorizeRecovery(executionId,{ownerId,expectedRevision,expectedFence}={}){
      const current=await this.get(executionId,{ownerId});
      if(!["completed","failed"].includes(current.state))throw new Error("Execution not eligible for recovery");
      return this.transition(executionId,{ownerId,expectedRevision,expectedFence,to:"recovering"});
    }
  });
}

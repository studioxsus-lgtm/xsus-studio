export const DURABLE_LEASE_MANAGER_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
function validId(v){return typeof v==="string"&&ID.test(v);}
function positive(v){return Number.isSafeInteger(v)&&v>0;}
function validLease(l,id){return l&&l.executionId===id&&validId(l.holderId)&&positive(l.fence)&&Number.isSafeInteger(l.expiresAt)&&l.expiresAt>=0;}
export function createDurableLeaseManager({store,clock=()=>Date.now(),maxDurationMs=30000}={}){
 if(!store||typeof store.read!=="function"||typeof store.createIfAbsent!=="function"||typeof store.compareAndSwap!=="function"||typeof clock!=="function"||!positive(maxDurationMs)||maxDurationMs>300000)throw new TypeError("Trusted durable lease dependencies required");
 function now(){const n=clock();if(!Number.isSafeInteger(n)||n<0)throw new TypeError("Invalid lease clock");return n;}
 function validate(executionId,holderId,durationMs){if(!validId(executionId)||!validId(holderId)||!positive(durationMs)||durationMs>maxDurationMs)throw new TypeError("Invalid lease request");}
 return Object.freeze({
  async acquire({executionId,holderId,durationMs}={}){
   validate(executionId,holderId,durationMs);
   const timestamp=now(),expiresAt=timestamp+durationMs;
   if(!Number.isSafeInteger(expiresAt))throw new TypeError("Lease expiry overflow");
   const current=await store.read(executionId);
   if(current===null){
    const next=Object.freeze({executionId,holderId,fence:1,expiresAt});
    if(await store.createIfAbsent(executionId,next)!==true)throw new Error("Concurrent lease acquisition");
    return next;
   }
   if(!validLease(current,executionId))throw new Error("Invalid stored lease");
   if(current.expiresAt>timestamp)throw new Error("Lease already held");
   if(!Number.isSafeInteger(current.fence+1))throw new Error("Lease fence overflow");
   const next=Object.freeze({executionId,holderId,fence:current.fence+1,expiresAt});
   if(await store.compareAndSwap(executionId,current,next)!==true)throw new Error("Concurrent lease acquisition");
   return next;
  },
  async renew({executionId,holderId,fence,durationMs}={}){
   validate(executionId,holderId,durationMs);
   if(!positive(fence))throw new TypeError("Invalid fencing token");
   const timestamp=now(),current=await store.read(executionId);
   if(!validLease(current,executionId)||current.holderId!==holderId||current.fence!==fence||current.expiresAt<=timestamp)throw new Error("Lease expired or ownership lost");
   const expiresAt=timestamp+durationMs;
   if(!Number.isSafeInteger(expiresAt))throw new TypeError("Lease expiry overflow");
   const next=Object.freeze({...current,expiresAt:Math.max(expiresAt,current.expiresAt)});
   if(await store.compareAndSwap(executionId,current,next)!==true)throw new Error("Concurrent lease renewal");
   return next;
  },
  async verify({executionId,holderId,fence}={}){
   if(!validId(executionId)||!validId(holderId)||!positive(fence))throw new TypeError("Invalid lease verification");
   const timestamp=now(),current=await store.read(executionId);
   return validLease(current,executionId)&&current.holderId===holderId&&current.fence===fence&&current.expiresAt>timestamp;
  },
  async release({executionId,holderId,fence}={}){
   if(!validId(executionId)||!validId(holderId)||!positive(fence))throw new TypeError("Invalid lease release");
   const current=await store.read(executionId);
   if(!validLease(current,executionId)||current.holderId!==holderId||current.fence!==fence)throw new Error("Lease ownership lost");
   const next=Object.freeze({...current,expiresAt:0});
   if(await store.compareAndSwap(executionId,current,next)!==true)throw new Error("Concurrent lease release");
   return true;
  }
 });
}

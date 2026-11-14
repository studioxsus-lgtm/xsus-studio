/**
 * Hyper XSUS Core v2.1.0 — fenced cross-process anchor coordination.
 *
 * Required external contracts:
 * lease.acquire() -> opaque token; lease.release(token)
 * highWater.read() -> safe nonnegative integer
 * highWater.advance(expected, next, token) MUST atomically enforce
 * both CAS and the current fencing token in the trusted backend.
 */
export const FENCED_AUDIT_COORDINATOR_VERSION="2.1.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
const seq=n=>Number.isSafeInteger(n)&&n>=0;
export function createFencedAuditCoordinator({anchors,highWater,lease}={}){
 if(!anchors||!["list","verify","rotate"].every(k=>typeof anchors[k]==="function")||
  !highWater||!["read","advance"].every(k=>typeof highWater[k]==="function")||
  !lease||!["acquire","release"].every(k=>typeof lease[k]==="function"))
  throw new TypeError("Trusted anchors, fenced high-water and lease provider required.");
 let busy=false;
 async function withFence(action){
  if(busy)throw fail("XSUS_AUDIT_COORDINATOR_BUSY","Coordinator already active.");
  busy=true;
  let token,acquired=false;
  try{
   token=await lease.acquire();
   if(token===null||token===undefined)
    throw fail("XSUS_AUDIT_FENCE_INVALID","Lease returned no fencing token.");
   acquired=true;
   return await action(token);
  }finally{
   try{if(acquired)await lease.release(token);}
   finally{busy=false;}
  }
 }
 async function inspectUnderFence(snapshot){
  const mark=await highWater.read();
  if(!seq(mark))throw fail("XSUS_HIGH_WATER_INVALID","Invalid trusted mark.");
  const sequences=await anchors.list();
  if(!sequences.length)throw fail("XSUS_ANCHOR_MISSING","No checkpoint.");
  const latest=sequences.at(-1);
  if(!seq(latest))throw fail("XSUS_ANCHOR_INVALID","Invalid checkpoint sequence.");
  if(latest<mark)throw fail("XSUS_ANCHOR_DELETION","Trusted checkpoint deleted.");
  if(latest>mark)throw fail("XSUS_ANCHOR_PENDING","Checkpoint not committed.");
  await anchors.verify(snapshot);
  return mark;
 }
 async function inspect(snapshot){
  return withFence(async()=>{
   const sequence=await inspectUnderFence(snapshot);
   return Object.freeze({sequence,status:"verified"});
  });
 }
 async function advance(snapshot){
  return withFence(async token=>{
   const previous=await inspectUnderFence(snapshot);
   const nextSequence=snapshot?.lastSequence;
   if(!seq(nextSequence)||nextSequence<=previous)
    throw fail("XSUS_ANCHOR_NONMONOTONIC","Checkpoint must advance.");
   const next=await anchors.rotate(snapshot);
   if(next?.sequence!==nextSequence)
    throw fail("XSUS_ANCHOR_INVALID","Anchor rotation returned wrong sequence.");
   // Backend MUST reject expired/stale tokens atomically with CAS.
   await highWater.advance(previous,nextSequence,token);
   return Object.freeze({sequence:nextSequence,status:"advanced"});
  });
 }
 return Object.freeze({version:FENCED_AUDIT_COORDINATOR_VERSION,inspect,advance});
}

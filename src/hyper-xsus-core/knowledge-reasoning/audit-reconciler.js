/**
 * Hyper XSUS Core v2.3.0 — explicit, fenced reconciliation of pending anchors.
 * A trusted external reviewer must authorize the exact sequence and digest.
 * No automatic promotion of orphaned checkpoints.
 */
export const AUDIT_RECONCILIATION_VERSION="2.3.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
const valid=n=>Number.isSafeInteger(n)&&n>=0;
export function createAuditReconciler({anchors,highWater,lease,authorize}={}){
 if(!anchors||!["list","verify"].every(k=>typeof anchors[k]==="function")||
 !highWater||!["read","advance"].every(k=>typeof highWater[k]==="function")||
 !lease||!["acquire","release"].every(k=>typeof lease[k]==="function")||
 typeof authorize!=="function")throw new TypeError("Independent anchor, high-water, lease and reviewer required.");
 let busy=false;
 async function reconcile(snapshot){
  if(busy)throw fail("XSUS_RECONCILE_BUSY","Reconciliation already active.");
  busy=true;let token,acquired=false;
  try{
   token=await lease.acquire();
   if(token===undefined||token===null)throw fail("XSUS_AUDIT_FENCE_INVALID","Missing fencing token.");
   acquired=true;
   const previous=await highWater.read();
   if(!valid(previous))throw fail("XSUS_HIGH_WATER_INVALID","Invalid high-water mark.");
   const sequences=await anchors.list();
   if(!sequences.length)throw fail("XSUS_ANCHOR_MISSING","No checkpoint.");
   const latest=sequences.at(-1);
   if(!valid(latest))throw fail("XSUS_ANCHOR_INVALID","Invalid checkpoint sequence.");
   if(latest<previous)throw fail("XSUS_ANCHOR_DELETION","Committed checkpoint missing.");
   if(latest===previous)throw fail("XSUS_RECONCILE_NOT_PENDING","No pending checkpoint.");
   if(snapshot?.lastSequence!==latest)
    throw fail("XSUS_RECONCILE_SNAPSHOT_MISMATCH","Snapshot does not match pending sequence.");
   // Must authenticate signed checkpoint against this exact journal snapshot.
   await anchors.verify(snapshot);
   const decision=await authorize(Object.freeze({previous,latest,snapshot}));
   if(decision!==true)throw fail("XSUS_RECONCILE_DENIED","Independent approval required.");
   // Trusted backend must atomically check both CAS and active fencing token.
   await highWater.advance(previous,latest,token);
   return Object.freeze({sequence:latest,status:"reconciled"});
  }finally{
   try{if(acquired)await lease.release(token);}
   finally{busy=false;}
  }
 }
 return Object.freeze({version:AUDIT_RECONCILIATION_VERSION,reconcile});
}

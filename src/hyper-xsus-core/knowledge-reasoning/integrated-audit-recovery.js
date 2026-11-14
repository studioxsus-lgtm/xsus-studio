/**
 * Hyper XSUS Core v3.0.0 — explicitly authorized recovery lifecycle.
 * This is an orchestration boundary, not a distributed lock or CAS backend.
 * A failed receipt write AFTER successful CAS is reported as incomplete;
 * never retry reconciliation or pretend the trusted mark was rolled back.
 */
export const INTEGRATED_AUDIT_RECOVERY_VERSION="3.0.0";
const fail=(code,message,cause)=>Object.assign(new Error(message,{cause}),{code});
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const hash=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
export function createIntegratedAuditRecovery({anchors,highWater,coordinator,reconciler,receipts}={}){
 if(!anchors||typeof anchors.verify!=="function"||
 !highWater||typeof highWater.read!=="function"||
 !coordinator||typeof coordinator.inspect!=="function"||
 !reconciler||typeof reconciler.reconcile!=="function"||
 !receipts||!["record","verifyAgainst","list","read"].every(k=>typeof receipts[k]==="function"))
  throw new TypeError("Independent anchors, trusted high-water, coordinator, reconciler and receipts required.");
 let busy=false;
 async function run(action){
  if(busy)throw fail("XSUS_RECOVERY_LIFECYCLE_BUSY","Lifecycle already active.");
  busy=true;
  try{return await action();}finally{busy=false;}
 }
 async function inspect(snapshot){
  return run(async()=>{
   const verified=await coordinator.inspect(snapshot);
   const mark=await highWater.read();
   if(!valid(mark)||mark!==verified.sequence)
    throw fail("XSUS_RECOVERY_MARK_CHANGED","Trusted high-water changed during inspection.");
   const evidence=await receipts.verifyAgainst({trustedSequence:mark,snapshot});
   return Object.freeze({sequence:mark,status:"verified",receipts:evidence.count});
  });
 }
 async function recover(snapshot){
  return run(async()=>{
   const latest=snapshot?.lastSequence;
   if(!valid(latest))throw fail("XSUS_RECOVERY_SNAPSHOT_INVALID","Invalid snapshot sequence.");
   const mark=await highWater.read();
   if(!valid(mark))throw fail("XSUS_HIGH_WATER_INVALID","Invalid trusted mark.");
   // Existing evidence must be sound before any reviewer is consulted.
   await receipts.verifyAgainst({trustedSequence:mark,snapshot});
   // The reconciler verifies the signed checkpoint and asks the external reviewer.
   // It alone owns the fencing token and trusted atomic CAS.
   const result=await reconciler.reconcile(snapshot);
   if(result?.status!=="reconciled"||result.sequence!==latest)
    throw fail("XSUS_RECOVERY_RESULT_INVALID","Unexpected reconciliation result.");
   const committed=await highWater.read();
   if(committed!==latest)
    throw fail("XSUS_RECOVERY_MARK_CHANGED","Trusted mark changed after reconciliation.");
   const entry=snapshot.entries?.find(e=>e.sequence===latest);
   const tipHash=entry?.hash;
   if(!hash(tipHash))
    throw fail("XSUS_RECOVERY_EVIDENCE_INCOMPLETE","Committed recovery has no observable tip hash.");
   try{
    await receipts.record({previous:mark,sequence:latest,tipHash});
   }catch(cause){
    throw fail("XSUS_RECOVERY_EVIDENCE_INCOMPLETE",
     "Recovery committed but durable evidence was not recorded; manual intervention required.",cause);
   }
   const evidence=await receipts.verifyAgainst({trustedSequence:latest,snapshot});
   return Object.freeze({sequence:latest,status:"reconciled",receipts:evidence.count});
  });
 }
 return Object.freeze({version:INTEGRATED_AUDIT_RECOVERY_VERSION,inspect,recover});
}

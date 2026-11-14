/**
 * Hyper XSUS Core — integrated recovery runtime bundle v3.2.0.
 *
 * Requires an independently trusted high-water/lease provider and an
 * independently durable, authenticated recovery inventory. No local
 * filesystem fixture is considered a production distributed backend.
 */
import {createRotatingAuditAnchors} from "./audit-anchor-rotation.js";
import {createFencedAuditCoordinator} from "./fenced-audit-coordinator.js";
import {createAuditReconciler} from "./audit-reconciler.js";
import {createPersistentRecoveryReceipts} from "./persistent-recovery-receipts.js";
import {createRecoveryConsistencyGate} from "./recovery-consistency-gate.js";
import {createIntegratedAuditRecovery} from "./integrated-audit-recovery.js";

export const RECOVERY_RUNTIME_VERSION="3.2.0";
const fail=(code,message,cause)=>Object.assign(new Error(message,{cause}),{code});
export function createAuditRecoveryRuntime({
 anchorDirectory,receiptDirectory,key,keyId,highWater,lease,authorize,expected
}={}){
 if(!highWater||typeof highWater.read!=="function"||
  typeof highWater.advance!=="function"||
  !lease||typeof lease.acquire!=="function"||typeof lease.release!=="function"||
  typeof authorize!=="function"||!expected||typeof expected.read!=="function")
  throw new TypeError("Trusted CAS/fencing, reviewer and independent recovery inventory required.");
 if(anchorDirectory===receiptDirectory)
  throw new TypeError("Anchor and receipt directories must be separate.");
 const anchors=createRotatingAuditAnchors({directory:anchorDirectory,key,keyId});
 const receipts=createPersistentRecoveryReceipts({directory:receiptDirectory,key,keyId});
 const coordinator=createFencedAuditCoordinator({anchors,highWater,lease});
 const reconciler=createAuditReconciler({anchors,highWater,lease,authorize});
 const lifecycle=createIntegratedAuditRecovery({anchors,highWater,coordinator,reconciler,receipts});
 const consistency=createRecoveryConsistencyGate({highWater,receipts,expected});
 let busy=false;
 async function guarded(fn){
  if(busy)throw fail("XSUS_RECOVERY_RUNTIME_BUSY","Recovery runtime already active.");
  busy=true;
  try{return await fn();}finally{busy=false;}
 }
 async function inspect(snapshot){
  return guarded(async()=>{
   // The independent inventory is checked before returning a healthy state.
   const evidence=await consistency.inspect(snapshot);
   const journal=await coordinator.inspect(snapshot);
   if(evidence.sequence!==journal.sequence)
    throw fail("XSUS_RECOVERY_MARK_CHANGED","Trusted state changed between inspections.");
   return Object.freeze({sequence:journal.sequence,receipts:evidence.receipts,status:"verified"});
  });
 }
 async function recover(snapshot){
  return guarded(async()=>{
   // Before any reviewer approval, existing evidence must be complete.
   await consistency.inspect(snapshot);
   const result=await lifecycle.recover(snapshot);
   // The inventory must have been durably updated by an independent
   // service after the CAS. We do not fabricate that confirmation.
   try{
    await consistency.inspect(snapshot);
   }catch(cause){
    throw fail("XSUS_RECOVERY_POSTCOMMIT_UNVERIFIED",
     "Trusted recovery committed, but independent evidence inventory is not yet consistent.",cause);
   }
   return Object.freeze(result);
  });
 }
 return Object.freeze({
  version:RECOVERY_RUNTIME_VERSION,inspect,recover,
  // Explicitly expose building blocks without mutating their contracts.
  anchors,receipts,coordinator,reconciler,consistency,lifecycle
 });
}

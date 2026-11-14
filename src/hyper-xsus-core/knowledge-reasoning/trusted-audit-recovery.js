/**
 * Hyper XSUS Core v2.0.0 — trusted external high-water verification.
 * Caller supplies an independent durable high-water provider. This module
 * does not claim that a local file is a trusted monotonic register.
 */
export const TRUSTED_AUDIT_RECOVERY_VERSION="2.0.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
const valid=x=>Number.isSafeInteger(x)&&x>=0;
export function createTrustedAuditRecovery({anchors,highWater}={}){
 if(!anchors||typeof anchors.list!=="function"||
  typeof anchors.verify!=="function"||typeof anchors.rotate!=="function"||
  !highWater||typeof highWater.read!=="function"||
  typeof highWater.advance!=="function")
  throw new TypeError("Independent anchor store and high-water provider required.");
 async function inspect(snapshot){
  const mark=await highWater.read();
  if(!valid(mark))throw fail("XSUS_HIGH_WATER_INVALID","Invalid trusted high-water mark.");
  const sequences=await anchors.list();
  if(!sequences.length)throw fail("XSUS_ANCHOR_MISSING","No audit anchors.");
  const latest=sequences.at(-1);
  if(latest<mark)
   throw fail("XSUS_ANCHOR_DELETION","Checkpoint missing below trusted high-water mark.");
  if(latest>mark)
   throw fail("XSUS_ANCHOR_PENDING","Checkpoint not yet committed to high-water provider.");
  await anchors.verify(snapshot);
  return Object.freeze({sequence:latest,status:"verified"});
 }
 async function advance(snapshot){
  // Only one trusted coordinator may advance this sequence at a time.
  // Crash after writing anchor but before high-water advancement leaves
  // a PENDING state requiring explicit operator reconciliation.
  const previous=await inspect(snapshot);
  if(!valid(snapshot?.lastSequence)||snapshot.lastSequence<=previous.sequence)
   throw fail("XSUS_ANCHOR_NONMONOTONIC","Anchor must advance.");
  const next=await anchors.rotate(snapshot);
  await highWater.advance(previous.sequence,next.sequence);
  return Object.freeze({sequence:next.sequence,status:"advanced"});
 }
 return Object.freeze({version:TRUSTED_AUDIT_RECOVERY_VERSION,inspect,advance});
}

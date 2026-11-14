/**
 * Hyper XSUS Core v3.5 — deterministic, read-only recovery incident policy.
 * Never automatically remove locks, advance CAS or manufacture evidence.
 */
export const RECOVERY_INCIDENT_POLICY_VERSION="3.5.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
const valid=n=>Number.isSafeInteger(n)&&n>=0;
function sortedUnique(values){
 return Array.isArray(values)&&values.every(valid)&&
 values.every((n,i)=>i===0||n>values[i-1]);
}
export function createRecoveryIncidentPolicy({assessor,consistency,highWater,expected,receipts}={}){
 if(!assessor||typeof assessor.assess!=="function"||
 !consistency||typeof consistency.inspect!=="function"||
 !highWater||typeof highWater.read!=="function"||
 !expected||typeof expected.read!=="function"||
 !receipts||typeof receipts.list!=="function")
 throw new TypeError("Assessor, signed consistency verifier and trusted sources required.");
 let busy=false;
 async function evaluate(snapshot){
  if(busy)throw fail("XSUS_INCIDENT_BUSY","Incident inspection already active.");
  busy=true;
  try{
   const before=await highWater.read();
   const inventory=await expected.read();
   const observed=await receipts.list();
   if(!valid(before)||!sortedUnique(inventory)||!sortedUnique(observed)||
    inventory.some(n=>n>before)||observed.some(n=>n>before))
    throw fail("XSUS_INCIDENT_STATE_INVALID","Invalid or inconsistent trusted state.");
   const report=await assessor.assess();
   if(report.sequence!==before||!["present","absent"].includes(report.lock))
    throw fail("XSUS_INCIDENT_STATE_CHANGED","Diagnostic and trusted state disagree.");
   const missing=inventory.filter(n=>!observed.includes(n));
   const unexpected=observed.filter(n=>!inventory.includes(n));
   if(!Array.isArray(report.missingReceipts)||!Array.isArray(report.unexpectedReceipts)||
    JSON.stringify(report.missingReceipts)!==JSON.stringify(missing)||
    JSON.stringify(report.unexpectedReceipts)!==JSON.stringify(unexpected))
    throw fail("XSUS_INCIDENT_STATE_CHANGED","Diagnostic evidence changed.");
   const blockers=[];
   if(report.lock==="present")blockers.push("LOCK_REVIEW_REQUIRED");
   if(missing.length)blockers.push("MISSING_RECOVERY_RECEIPTS");
   if(unexpected.length)blockers.push("UNEXPECTED_RECOVERY_RECEIPTS");
   let verified=false;
   if(!blockers.length){
    // Must cryptographically validate signed receipts and journal, not merely counts.
    await consistency.inspect(snapshot);
    verified=true;
   }
   if(await highWater.read()!==before||
    JSON.stringify(await expected.read())!==JSON.stringify(inventory)||
    JSON.stringify(await receipts.list())!==JSON.stringify(observed))
    throw fail("XSUS_INCIDENT_STATE_CHANGED","Trusted state changed during inspection.");
   return Object.freeze({
    version:RECOVERY_INCIDENT_POLICY_VERSION,
    sequence:before,
    status:blockers.length?"manual-intervention-required":"verified",
    safeToResume:verified,
    blockers:Object.freeze(blockers),
    missingReceipts:Object.freeze(missing),
    unexpectedReceipts:Object.freeze(unexpected)
   });
  }finally{busy=false;}
 }
 return Object.freeze({version:RECOVERY_INCIDENT_POLICY_VERSION,evaluate});
}

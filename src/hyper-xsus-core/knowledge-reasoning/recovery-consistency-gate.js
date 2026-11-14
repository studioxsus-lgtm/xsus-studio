/**
 * Hyper XSUS Core v3.1 — fail-closed recovery evidence consistency gate.
 * expected.read() MUST be independent, durable, authenticated inventory of
 * recovery sequences; this module never manufactures missing receipts.
 */
export const RECOVERY_CONSISTENCY_VERSION="3.1.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
const valid=n=>Number.isSafeInteger(n)&&n>=0;
export function createRecoveryConsistencyGate({highWater,receipts,expected}={}){
 if(!highWater||typeof highWater.read!=="function"||
 !receipts||!["list","read","verifyAgainst"].every(k=>typeof receipts[k]==="function")||
 !expected||typeof expected.read!=="function")
  throw new TypeError("Trusted high-water, receipts and independent expected inventory required.");
 let busy=false;
 async function inspect(snapshot){
  if(busy)throw fail("XSUS_RECOVERY_CONSISTENCY_BUSY","Inspection already active.");
  busy=true;
  try{
   const mark=await highWater.read();
   if(!valid(mark))throw fail("XSUS_HIGH_WATER_INVALID","Invalid trusted high-water.");
   const expectedSequences=await expected.read();
   if(!Array.isArray(expectedSequences)||expectedSequences.some(n=>!valid(n))||
    expectedSequences.some((n,i)=>i>0&&n<=expectedSequences[i-1]))
    throw fail("XSUS_RECOVERY_INVENTORY_INVALID","Expected recovery inventory must be sorted and unique.");
   if(expectedSequences.some(n=>n>mark))
    throw fail("XSUS_RECOVERY_INVENTORY_AHEAD","Expected recovery exceeds trusted high-water.");
   const observed=await receipts.list();
   if(!Array.isArray(observed)||observed.some(n=>!valid(n))||
    observed.some((n,i)=>i>0&&n<=observed[i-1]))
    throw fail("XSUS_RECOVERY_RECEIPT_INVALID","Receipt listing is not sorted and unique.");
   const missing=expectedSequences.filter(n=>!observed.includes(n));
   if(missing.length)throw fail("XSUS_RECOVERY_RECEIPT_MISSING","Expected signed recovery receipt missing.");
   const unexpected=observed.filter(n=>!expectedSequences.includes(n));
   if(unexpected.length)throw fail("XSUS_RECOVERY_RECEIPT_UNEXPECTED","Receipt absent from independent recovery inventory.");
   const verified=await receipts.verifyAgainst({trustedSequence:mark,snapshot});
   if(verified?.count!==observed.length||verified?.status!=="verified")
    throw fail("XSUS_RECOVERY_RECEIPT_INVALID","Receipt verification returned inconsistent count.");
   if(await highWater.read()!==mark)
    throw fail("XSUS_RECOVERY_MARK_CHANGED","Trusted high-water changed during inspection.");
   const after=await expected.read();
   if(!Array.isArray(after)||after.length!==expectedSequences.length||
    after.some((n,i)=>n!==expectedSequences[i]))
    throw fail("XSUS_RECOVERY_INVENTORY_CHANGED","Recovery inventory changed during inspection.");
   return Object.freeze({sequence:mark,receipts:observed.length,status:"verified"});
  }finally{busy=false;}
 }
 return Object.freeze({version:RECOVERY_CONSISTENCY_VERSION,inspect});
}

/**
 * Hyper XSUS Core v3.4 — read-only incident assessment after process crash.
 * Does NOT remove stale locks, forge receipts or modify trusted state.
 */
import {lstat,readFile} from "node:fs/promises";
import {join} from "node:path";
export const CRASH_ASSESSMENT_VERSION="3.4.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
export function createCrashRecoveryAssessor({directory,highWater,expected,receipts}={}){
 if(typeof directory!=="string"||!highWater||typeof highWater.read!=="function"||
 !expected||typeof expected.read!=="function"||
 !receipts||typeof receipts.list!=="function")
 throw new TypeError("Trusted directory, high-water, inventory and receipts required.");
 async function assess(){
  let lock="absent",token=null;
  try{
   const st=await lstat(join(directory,"lease.lock"));
   if(!st.isDirectory())throw fail("XSUS_CRASH_LOCK_UNSAFE","Lock path is not a directory.");
   lock="present";
   try{
    const t=await lstat(join(directory,"lease.lock","token"));
    if(!t.isFile()||t.isSymbolicLink())throw fail("XSUS_CRASH_LOCK_UNSAFE","Unsafe lock token.");
    token=(await readFile(join(directory,"lease.lock","token"),"utf8")).length>0?"present":"empty";
   }catch(e){if(e.code==="ENOENT")token="missing";else throw e;}
  }catch(e){if(e.code!=="ENOENT")throw e;}
  const mark=await highWater.read(),inventory=await expected.read(),observed=await receipts.list();
  if(!Number.isSafeInteger(mark)||mark<0||!Array.isArray(inventory)||!Array.isArray(observed))
   throw fail("XSUS_CRASH_STATE_INVALID","Invalid recovery state.");
  const missing=inventory.filter(n=>!observed.includes(n));
  const unexpected=observed.filter(n=>!inventory.includes(n));
  const status=lock==="present"?"manual-lock-review":
   missing.length||unexpected.length?"evidence-incomplete":"consistent";
  return Object.freeze({status,lock,token,sequence:mark,
   missingReceipts:Object.freeze(missing),unexpectedReceipts:Object.freeze(unexpected),
   // Read-only diagnostic: not proof of signed journal/receipt integrity.
   integrityVerified:false});
 }
 return Object.freeze({version:CRASH_ASSESSMENT_VERSION,assess});
}

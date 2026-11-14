/**
 * Hyper XSUS Core v7.0 — coordinated recovery security assessment.
 * Read-only advisory; never grants authorization or an atomic recovery lease.
 */
import {createRecoveryOperationalVerification} from "./recovery-operational-verification-v65.js";
import {createRecoverySecurityValidation} from "./recovery-security-validation-v68.js";
export const RECOVERY_SECURITY_ARCHITECTURE_VERSION="7.0.0";
const same=(a,b)=>a&&b&&a.count===b.count&&a.tip===b.tip;
export function createRecoverySecurityArchitecture({inspectHealth}={}){
 if(typeof inspectHealth!=="function")throw new TypeError("Health inspector required.");
 const operational=createRecoveryOperationalVerification({inspectHealth});
 const security=createRecoverySecurityValidation({inspectHealth});
 async function assess(){
  // Each verifier independently performs two inspections. Cross-check both
  // results to detect changes between the independent verification windows.
  const first=await operational.assess();
  const second=await security.assess();
  const blockers=[...first.blockers,...second.blockers];
  const consistent=first.safeToResume===true&&second.safeToResume===true&&
   first.stable===true&&second.stable===true&&
   same(first.anchor,second.anchor)&&same(first.audit,second.audit);
  if(!consistent)blockers.push("RECOVERY_SECURITY_CROSS_CHECK_FAILED");
  const unique=Object.freeze([...new Set(blockers)].sort());
  const safe=unique.length===0;
  return Object.freeze({
   version:RECOVERY_SECURITY_ARCHITECTURE_VERSION,
   status:safe?"ready":"manual-intervention-required",
   safeToResume:safe,
   consistent,
   blockers:unique,
   anchor:safe?Object.freeze({...second.anchor}):null,
   audit:safe?Object.freeze({...second.audit}):null
  });
 }
 return Object.freeze({version:RECOVERY_SECURITY_ARCHITECTURE_VERSION,assess});
}

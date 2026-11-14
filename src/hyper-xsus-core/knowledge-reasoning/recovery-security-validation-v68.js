/**
 * Hyper XSUS Core v6.8 — strict, read-only operational security validation.
 * Advisory only: does not authorize recovery or create an atomic snapshot.
 */
export const RECOVERY_SECURITY_VALIDATION_VERSION="6.8.0";
const HASH=/^[a-f0-9]{64}$/;
const mark=x=>x&&typeof x==="object"&&!Array.isArray(x)&&
 Number.isSafeInteger(x.count)&&x.count>=0&&
 typeof x.tip==="string"&&HASH.test(x.tip);
const same=(a,b)=>a.count===b.count&&a.tip===b.tip;
export function createRecoverySecurityValidation({inspectHealth}={}){
 if(typeof inspectHealth!=="function")throw new TypeError("Health inspector required.");
 async function assess(){
  const blockers=[];
  const snapshots=[];
  for(let i=0;i<2;i++){
   let report;
   try{report=await inspectHealth();}
   catch(error){
    if(typeof error?.code==="string"&&
      /^(XSUS_|AUDIT_|ANCHOR_)/.test(error.code)){
     blockers.push("SECURITY_INSPECTION_ERROR");
     continue;
    }
    throw error;
   }
   if(!report||typeof report!=="object"||Array.isArray(report)||
    report.safeToResume!==true||report.status!=="ready"||
    !Array.isArray(report.blockers)||report.blockers.length!==0||
    !mark(report.anchor)||!mark(report.audit)||
    report.audit.count<report.anchor.count){
    blockers.push("SECURITY_HEALTH_INVALID");
    continue;
   }
   // Copy scalar values immediately: never retain caller-owned mutable reports.
   snapshots.push(Object.freeze({
    anchor:Object.freeze({count:report.anchor.count,tip:report.anchor.tip}),
    audit:Object.freeze({count:report.audit.count,tip:report.audit.tip})
   }));
  }
  const stable=snapshots.length===2&&
   same(snapshots[0].anchor,snapshots[1].anchor)&&
   same(snapshots[0].audit,snapshots[1].audit);
  if(!stable)blockers.push("SECURITY_STATE_UNSTABLE");
  const unique=Object.freeze([...new Set(blockers)].sort());
  return Object.freeze({
   version:RECOVERY_SECURITY_VALIDATION_VERSION,
   status:unique.length?"manual-intervention-required":"ready",
   safeToResume:unique.length===0,
   stable,
   blockers:unique,
   anchor:stable?snapshots[1].anchor:null,
   audit:stable?snapshots[1].audit:null
  });
 }
 return Object.freeze({version:RECOVERY_SECURITY_VALIDATION_VERSION,assess});
}

/**
 * Hyper XSUS Core v6.5 — read-only operational recovery verification.
 * Two observations are not an atomic lease or authorization to resume.
 */
export const RECOVERY_OPERATIONAL_VERIFICATION_VERSION="6.5.0";
const HEX=/^[a-f0-9]{64}$/;
const valid=x=>x&&Number.isSafeInteger(x.count)&&x.count>=0&&
 typeof x.tip==="string"&&HEX.test(x.tip);
const same=(a,b)=>valid(a)&&valid(b)&&a.count===b.count&&a.tip===b.tip;
export function createRecoveryOperationalVerification({inspectHealth}={}){
 if(typeof inspectHealth!=="function")throw new TypeError("Health inspector required.");
 async function assess(){
  const blockers=[];
  const observations=[];
  for(let i=0;i<2;i++){
   let report;
   try{report=await inspectHealth();}
   catch(e){
    if(typeof e?.code==="string"&&(e.code.startsWith("XSUS_")||e.code.startsWith("AUDIT_")||e.code.startsWith("ANCHOR_"))){
     blockers.push("OPERATIONAL_INSPECTION_ERROR");continue;
    }
    throw e;
   }
   if(!report||typeof report!=="object"||
    report.safeToResume!==true||report.status!=="ready"||
    !Array.isArray(report.blockers)||report.blockers.length||
    !valid(report.anchor)||!valid(report.audit)||
    report.audit.count<report.anchor.count){
    blockers.push("OPERATIONAL_HEALTH_NOT_READY");
   }
   if(Array.isArray(report?.blockers))blockers.push(...report.blockers);
   observations.push(report);
  }
  if(observations.length!==2||!same(observations[0]?.anchor,observations[1]?.anchor)||
   !same(observations[0]?.audit,observations[1]?.audit))
   blockers.push("OPERATIONAL_STATE_CHANGED");
  const unique=Object.freeze([...new Set(blockers)].sort());
  const stable=observations.length===2&&same(observations[0]?.anchor,observations[1]?.anchor)&&
   same(observations[0]?.audit,observations[1]?.audit);
  return Object.freeze({
   version:RECOVERY_OPERATIONAL_VERIFICATION_VERSION,
   status:unique.length?"manual-intervention-required":"ready",
   safeToResume:unique.length===0,
   blockers:unique,
   stable,
   anchor:stable?Object.freeze({...observations[1].anchor}):null,
   audit:stable?Object.freeze({...observations[1].audit}):null
  });
 }
 return Object.freeze({version:RECOVERY_OPERATIONAL_VERIFICATION_VERSION,assess});
}

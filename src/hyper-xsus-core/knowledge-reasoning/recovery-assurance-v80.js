/**
 * Hyper XSUS Core v8.0 — bounded multi-round recovery assurance.
 * Advisory only. No atomic snapshot, recovery lease, or authorization.
 */
import {createRecoverySecurityArchitecture} from "./recovery-security-architecture-v70.js";
export const RECOVERY_ASSURANCE_VERSION="8.0.0";
const MAX_ROUNDS=8;
const same=(a,b)=>a&&b&&a.count===b.count&&a.tip===b.tip;
const copy=x=>Object.freeze({count:x.count,tip:x.tip});
export function createRecoveryAssurance({inspectHealth,rounds=3}={}){
 if(typeof inspectHealth!=="function")throw new TypeError("Health inspector required.");
 if(!Number.isSafeInteger(rounds)||rounds<2||rounds>MAX_ROUNDS)
  throw new RangeError("Assurance rounds must be an integer from 2 to 8.");
 const architecture=createRecoverySecurityArchitecture({inspectHealth});
 async function assess(){
  const blockers=new Set();
  let baseline=null;
  let completed=0;
  for(let i=0;i<rounds;i++){
   const report=await architecture.assess();
   completed++;
   if(report.safeToResume!==true||report.consistent!==true||
      !report.anchor||!report.audit){
    for(const blocker of report.blockers)blockers.add(blocker);
    blockers.add("RECOVERY_ASSURANCE_ROUND_BLOCKED");
    // Continue only read-only verification; never grant readiness if a round failed.
    continue;
   }
   const snapshot={anchor:copy(report.anchor),audit:copy(report.audit)};
   if(baseline===null)baseline=snapshot;
   else if(!same(baseline.anchor,snapshot.anchor)||
           !same(baseline.audit,snapshot.audit))
    blockers.add("RECOVERY_ASSURANCE_CROSS_ROUND_CHANGED");
  }
  if(!baseline)blockers.add("RECOVERY_ASSURANCE_NO_STABLE_BASELINE");
  const unique=Object.freeze([...blockers].sort());
  const safe=unique.length===0;
  return Object.freeze({
   version:RECOVERY_ASSURANCE_VERSION,
   status:safe?"ready":"manual-intervention-required",
   safeToResume:safe,
   consistent:safe,
   rounds,
   completed,
   blockers:unique,
   anchor:safe?baseline.anchor:null,
   audit:safe?baseline.audit:null
  });
 }
 return Object.freeze({version:RECOVERY_ASSURANCE_VERSION,assess});
}

/**
 * Hyper XSUS Core v5.0 — read-only operational recovery report.
 * Never approves promotion, repairs artifacts, or mutates trusted state.
 */
export const RECOVERY_OPERATIONAL_REPORT_VERSION="5.0.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
export function createRecoveryOperationalReport({inspectReadiness,verifyArchive,readCheckpoint}={}){
 if(typeof inspectReadiness!=="function"||typeof verifyArchive!=="function"||
 typeof readCheckpoint!=="function")
  throw new TypeError("Readiness, signed archive and checkpoint readers required.");
 async function assess(){
  const readiness=await inspectReadiness();
  if(!readiness||!Array.isArray(readiness.blockers)||
   typeof readiness.safeToResume!=="boolean"||
   readiness.blockers.some(b=>typeof b!=="string"||!b))
   throw fail("XSUS_RECOVERY_OPERATIONAL_INVALID","Malformed readiness assessment.");
  const checkpoint=await readCheckpoint();
  const archive=await verifyArchive();
  const validCount=n=>Number.isSafeInteger(n)&&n>=0;
  const hex=/^[a-f0-9]{64}$/;
  if(!checkpoint||!validCount(checkpoint.count)||!hex.test(checkpoint.tip)||
   !archive||!validCount(archive.count)||!hex.test(archive.tip)||
   !Array.isArray(archive.entries)||archive.entries.length!==archive.count)
   throw fail("XSUS_RECOVERY_OPERATIONAL_INVALID","Malformed authenticated storage result.");
  const core=readiness.core;
  if(!core||!validCount(core.archiveCount)||!validCount(core.trustedCount)||
   core.archiveCount!==archive.count||core.archiveTip!==archive.tip||
   core.trustedCount!==checkpoint.count||core.trustedTip!==checkpoint.tip)
   throw fail("XSUS_RECOVERY_OPERATIONAL_CHANGED","Storage changed since readiness assessment.");
  const verified=await inspectReadiness();
  if(!verified||!Array.isArray(verified.blockers)||
   verified.safeToResume!==readiness.safeToResume||
   JSON.stringify(verified.blockers)!==JSON.stringify(readiness.blockers)||
   !verified.core||verified.core.archiveCount!==core.archiveCount||
   verified.core.archiveTip!==core.archiveTip||
   verified.core.trustedCount!==core.trustedCount||
   verified.core.trustedTip!==core.trustedTip)
   throw fail("XSUS_RECOVERY_OPERATIONAL_CHANGED","Readiness changed during reporting.");
  // Re-read both authenticated stores after the second readiness assessment.
  // A mutation between the first storage reads and the final guard must
  // never yield a report claiming a stable ready snapshot.
  const finalCheckpoint=await readCheckpoint();
  const finalArchive=await verifyArchive();
  if(!finalCheckpoint||finalCheckpoint.count!==checkpoint.count||
   finalCheckpoint.tip!==checkpoint.tip||
   !finalArchive||finalArchive.count!==archive.count||
   finalArchive.tip!==archive.tip||
   !Array.isArray(finalArchive.entries)||finalArchive.entries.length!==archive.entries.length)
   throw fail("XSUS_RECOVERY_OPERATIONAL_CHANGED","Authenticated storage changed during reporting.");
  for(let i=0;i<archive.entries.length;i++)
   if(finalArchive.entries[i]?.sequence!==archive.entries[i]?.sequence||
    finalArchive.entries[i]?.signature!==archive.entries[i]?.signature)
    throw fail("XSUS_RECOVERY_OPERATIONAL_CHANGED","Archive evidence changed during reporting.");
  const blockers=Object.freeze([...new Set(readiness.blockers)]);
  const safeToResume=readiness.safeToResume===true&&blockers.length===0&&
   archive.count===checkpoint.count&&archive.tip===checkpoint.tip;
  return Object.freeze({
   version:RECOVERY_OPERATIONAL_REPORT_VERSION,
   status:safeToResume?"ready":"manual-intervention-required",
   safeToResume,
   blockers,
   archive:Object.freeze({count:archive.count,tip:archive.tip}),
   checkpoint:Object.freeze({count:checkpoint.count,tip:checkpoint.tip})
  });
 }
 return Object.freeze({version:RECOVERY_OPERATIONAL_REPORT_VERSION,assess});
}

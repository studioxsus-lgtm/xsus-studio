/**
 * Hyper XSUS Core v5.3 — deterministic read-only incident classification.
 * Diagnostic labels are advisory; no recovery or authorization actions.
 */
export const RECOVERY_DIAGNOSTICS_VERSION="5.3.0";
const classify=code=>{
 if(code==="ARCHIVE_ROLLBACK"||code==="TRUSTED_PREFIX_FORK")return ["integrity","critical"];
 if(code==="UNANCHORED_ARCHIVE_TAIL")return ["unanchored-evidence","high"];
 if(/^(?:ARCHIVE_WRITER_LOCK|CHECKPOINT_WRITER_LOCK|WRITER_LOCK)_REVIEW_REQUIRED$/.test(code))return ["writer-lock","high"];
 if(code==="CHECKPOINT_PENDING_REVIEW_REQUIRED")return ["incomplete-write","high"];
 return ["unclassified","high"];
};
export function classifyRecoveryOperationalReport(report){
 if(!report||typeof report!=="object"||
  typeof report.safeToResume!=="boolean"||
  !["ready","manual-intervention-required"].includes(report.status)||
  !Array.isArray(report.blockers)||
  report.blockers.some(b=>typeof b!=="string"||b.length===0)||
  (report.safeToResume&& (report.status!=="ready"||report.blockers.length!==0))||
  (!report.safeToResume&&report.status!=="manual-intervention-required"))
  throw Object.assign(new Error("Invalid operational report."),{code:"XSUS_RECOVERY_DIAGNOSTICS_INVALID"});
 const incidents=Object.freeze([...new Set(report.blockers)].sort().map(code=>{
  const [category,severity]=classify(code);
  return Object.freeze({code,category,severity,requiresManualReview:true});
 }));
 const severity=report.safeToResume?"none":
  incidents.some(i=>i.severity==="critical")?"critical":"high";
 return Object.freeze({
  version:RECOVERY_DIAGNOSTICS_VERSION,
  status:report.safeToResume?"ready":"manual-intervention-required",
  safeToResume:report.safeToResume,
  severity,
  incidents,
  requiresManualReview:!report.safeToResume
 });
}
export function createRecoveryDiagnostics({inspectOperationalReadiness}={}){
 if(typeof inspectOperationalReadiness!=="function")
  throw new TypeError("Operational readiness reader required.");
 return Object.freeze({
  version:RECOVERY_DIAGNOSTICS_VERSION,
  assess:async()=>classifyRecoveryOperationalReport(await inspectOperationalReadiness())
 });
}

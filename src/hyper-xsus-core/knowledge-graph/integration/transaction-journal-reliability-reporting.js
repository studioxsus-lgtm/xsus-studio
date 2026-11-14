/**
 * Hyper XSUS Core v6.8.0 — immutable reliability stress reports.
 * Pure reporting only. No filesystem writes, retries, or notifications.
 * Input measurements must come from completed tests; never infer success.
 */
export const RELIABILITY_REPORT_VERSION="6.8.0";
const MODES=new Set(["post-commit-SIGKILL","concurrent-appends","sequential-appends","pre-rename-SIGKILL","custom"]);
const validCount=value=>Number.isSafeInteger(value)&&value>=0;
const validText=value=>typeof value==="string"&&value.length>0&&value.length<=128;
const validDigest=value=>value===null||(typeof value==="string"&&/^[a-f0-9]{64}$/.test(value));
function validate(input){
 if(!input||typeof input!=="object"||Array.isArray(input)||!validText(input.testId)||
    !MODES.has(input.mode)||!validCount(input.operations)||
    !validCount(input.passed)||!validCount(input.failed)||
    input.passed+input.failed!==input.operations||
    !validCount(input.elapsedMs)||typeof input.integrityVerified!=="boolean"||
    typeof input.powerLossVerified!=="boolean"||
    !validDigest(input.revision??null)||
    !Array.isArray(input.errors)||input.errors.length>input.failed)
  throw new TypeError("Invalid reliability stress measurement.");
 for(const error of input.errors)
  if(!error||typeof error!=="object"||Array.isArray(error)||
     !validText(error.code)||!validCount(error.count)||error.count<1)
   throw new TypeError("Invalid reliability stress error.");
 if(new Set(input.errors.map(e=>e.code)).size!==input.errors.length||
    input.errors.reduce((n,e)=>n+e.count,0)>input.failed)
  throw new TypeError("Invalid reliability stress error totals.");
}
export function createReliabilityReport(measurement){
 validate(measurement);
 const errors=Object.freeze(measurement.errors.map(e=>Object.freeze({code:e.code,count:e.count})));
 const status=measurement.failed>0||!measurement.integrityVerified?"failed":"passed";
 return Object.freeze({
  version:RELIABILITY_REPORT_VERSION,testId:measurement.testId,mode:measurement.mode,
  operations:measurement.operations,passed:measurement.passed,failed:measurement.failed,
  elapsedMs:measurement.elapsedMs,integrityVerified:measurement.integrityVerified,
  powerLossVerified:measurement.powerLossVerified,revision:measurement.revision??null,
  errors,status,advisory:true,readOnly:true,
 });
}
export function compareReliabilityReports(baseline,current,{maxSlowdownRatio=1.5}={}){
 if(!Number.isFinite(maxSlowdownRatio)||maxSlowdownRatio<1)
  throw new RangeError("maxSlowdownRatio must be finite and at least 1.");
 const before=createReliabilityReport(baseline);
 const after=createReliabilityReport(current);
 if(before.testId!==after.testId||before.mode!==after.mode||
    before.operations!==after.operations)
  throw new TypeError("Reliability reports must have the same testId, mode, and operations.");
 const reasons=[];
 if(after.failed>before.failed)reasons.push("FAILURES_INCREASED");
 if(before.integrityVerified&&!after.integrityVerified)reasons.push("INTEGRITY_REGRESSED");
 if(before.status==="passed"&&after.status==="failed")reasons.push("STATUS_REGRESSED");
 // Compare normalized duration only when the baseline is measurable.
 const slowdownRatio=before.elapsedMs>0?after.elapsedMs/before.elapsedMs:null;
 if(slowdownRatio!==null&&slowdownRatio>maxSlowdownRatio)
  reasons.push("DURATION_REGRESSED");
 return Object.freeze({
  version:RELIABILITY_REPORT_VERSION,baseline:before,current:after,
  regression:reasons.length>0,reasons:Object.freeze(reasons),
  slowdownRatio,advisory:true,readOnly:true,
 });
}
export function summarizeReliabilityReports(reports){
 if(!Array.isArray(reports))throw new TypeError("reports must be an array.");
 const normalized=reports.map(createReliabilityReport);
 const totals=normalized.reduce((sum,r)=>{
  sum.operations+=r.operations;sum.passed+=r.passed;sum.failed+=r.failed;sum.elapsedMs+=r.elapsedMs;
  return sum;
 },{operations:0,passed:0,failed:0,elapsedMs:0});
 if(Object.values(totals).some(v=>!Number.isSafeInteger(v)))
  throw new RangeError("Reliability report totals exceed safe integer range.");
 return Object.freeze({version:RELIABILITY_REPORT_VERSION,reportCount:normalized.length,
  ...totals,allIntegrityVerified:normalized.every(r=>r.integrityVerified),
  status:normalized.every(r=>r.status==="passed")?"passed":"failed",
  advisory:true,readOnly:true});
}

export const PRODUCTION_READINESS_GATE_VERSION="0.1.0";
const CHECKS=Object.freeze([
 "ciRegressionPassed","realDockerExecutionPassed","containerStagingReadableByUid65534",
 "hostIsolationVerified","durablePostgresClaimVerified","runtimeFenceEnforced",
 "cancellationRecoveryVerified","productionAuthorizationVerified",
 "databaseRlsVerified","deploymentSmokeTestPassed"
]);
/**
 * Evidence-driven, fail-closed assessment. A boolean is not evidence:
 * every passed check must have a non-empty external verification reference.
 */
export function assessProductionReadiness(evidence={}){
 if(!evidence||typeof evidence!=="object"||Array.isArray(evidence))throw new TypeError("Invalid readiness evidence");
 for(const key of Object.keys(evidence))if(!CHECKS.includes(key))throw new TypeError("Unknown readiness check");
 const checks=CHECKS.map(key=>{
  const entry=evidence[key];
  const verified=entry?.passed===true&&typeof entry.reference==="string"&&entry.reference.trim().length>=8&&entry.reference.length<=512;
  return Object.freeze({key,verified,reference:verified?entry.reference.trim():null});
 });
 return Object.freeze({ready:checks.every(check=>check.verified),verifiedCount:checks.filter(check=>check.verified).length,totalCount:checks.length,checks:Object.freeze(checks)});
}
export const PRODUCTION_READINESS_CHECKS=CHECKS;

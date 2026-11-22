import {validateBuildManifest} from "../build/build-manifest.js";
import {inspectReleaseSecurity} from "../security/release-security-gate.js";
export const RELEASE_READINESS_VERSION="0.1.0";
const CHECKS=Object.freeze(["unitTests","integrationTests","sandboxIsolation","dependencyAudit","deploymentDryRun","rlsVerification"]);
export function assessReleaseReadiness(input,{evidence={}}={}){
  const manifest=validateBuildManifest(input);
  if(!evidence||typeof evidence!=="object"||Array.isArray(evidence))throw new TypeError("Release evidence must be an object");
  const security=inspectReleaseSecurity(manifest);
  const checks=CHECKS.map(name=>{
    const entry=evidence[name];
    const valid=entry&&typeof entry==="object"&&entry.passed===true&&typeof entry.reference==="string"&&entry.reference.trim().length>0&&entry.reference.length<=500;
    return Object.freeze({name,passed:Boolean(valid),reference:valid?entry.reference:null});
  });
  const blockers=[];
  if(!security.staticChecksPassed)blockers.push("static-security");
  for(const check of checks)if(!check.passed)blockers.push(check.name);
  return Object.freeze({version:RELEASE_READINESS_VERSION,project:manifest.project,status:blockers.length?"blocked":"review-required",productionApproved:false,checks:Object.freeze(checks),blockers:Object.freeze(blockers),security,requiresHumanApproval:true});
}

import {validateBuildManifest} from "../build/build-manifest.js";
import {createQualityGate} from "../quality/quality-gate.js";
import {inspectReleaseSecurity} from "../security/release-security-gate.js";
import {assessReleaseReadiness} from "../release/release-readiness.js";
export const BUILD_VERIFICATION_VERSION="0.1.0";
export function verifyPreparedBuild(prepared,{evidence={}}={}){
  if(!prepared||typeof prepared!=="object"||prepared.status!=="review-required"||prepared.productionApproved!==false)throw new TypeError("Untrusted prepared build");
  const manifest=validateBuildManifest(prepared.manifest);
  if(prepared.project!==manifest.project||prepared.architecture?.slug!==manifest.project)throw new TypeError("Project identity mismatch");
  const quality=createQualityGate({maxWarnings:0}).inspect(manifest);
  const security=inspectReleaseSecurity(manifest);
  const readiness=assessReleaseReadiness(manifest,{evidence});
  const blockers=new Set(readiness.blockers);
  if(!quality.approved)blockers.add("quality-gate");
  if(!security.staticChecksPassed)blockers.add("security-gate");
  return Object.freeze({version:BUILD_VERIFICATION_VERSION,project:manifest.project,jobId:prepared.jobId??null,quality,security,readiness,blockers:Object.freeze([...blockers]),status:"review-required",productionApproved:false,requiresHumanApproval:true});
}

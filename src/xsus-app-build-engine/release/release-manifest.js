import {assessReleaseReadiness} from "./release-readiness.js";
export const RELEASE_CANDIDATE_VERSION="0.1.0";
const VERSION=/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/;
export function createReleaseCandidate(input,{version,evidence={},artifactDigest}={}){
  if(typeof version!=="string"||!VERSION.test(version))throw new TypeError("Invalid semantic version");
  if(typeof artifactDigest!=="string"||!/^[a-f0-9]{64}$/i.test(artifactDigest))throw new TypeError("Verified SHA-256 artifact digest required");
  const readiness=assessReleaseReadiness(input,{evidence});
  return Object.freeze({schemaVersion:RELEASE_CANDIDATE_VERSION,version,project:readiness.project,artifactDigest:artifactDigest.toLowerCase(),status:readiness.status,productionApproved:false,readiness,requiresHumanApproval:true});
}

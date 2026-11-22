// Validation-only orchestration. Dependencies must be injected by trusted server code.
// This module never accepts a client attestation as authority and never deploys.
import {isPersistedBuilderProjectId} from './project-id-contract.js';
import {inspectServerBuild} from './server-build-preflight.js';
const reject=reason=>Object.freeze({status:'denied',reason,deployed:false,manifest:null});
export async function reviewSavedProjectBuild({projectId,ownerId}={},dependencies={}) {
 if(!isPersistedBuilderProjectId(projectId)||!isPersistedBuilderProjectId(ownerId))
  return reject('INVALID_PROJECT_IDENTITY');
 if(typeof dependencies.findOwnedProject!=='function'||
    typeof dependencies.buildFromSavedProject!=='function')
  return reject('TRUSTED_DEPENDENCIES_UNAVAILABLE');
 try {
  const project=await dependencies.findOwnedProject({projectId,ownerId});
  if(!project||project.id!==projectId||project.ownerId!==ownerId)
   return reject('PROJECT_OWNERSHIP_NOT_VERIFIED');
  // Only a server-controlled builder receives the verified project reference.
  // No request-body files or provenance flags are passed through.
  const files=await dependencies.buildFromSavedProject({projectId,ownerId});
  const result=inspectServerBuild(files);
  if(!result.ok) return reject('BUILD_PREFLIGHT_FAILED');
  return Object.freeze({status:'ready-for-review',reason:'STATIC_VALIDATION_ONLY',
   deployed:false,manifest:result.manifest});
 } catch {
  return reject('BUILD_REVIEW_UNAVAILABLE');
 }
}

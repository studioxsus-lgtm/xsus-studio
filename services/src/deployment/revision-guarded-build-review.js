// Validation-only revision guard for XSUS App. Both digests must come from
// independent owner-scoped server reads, never from browser request fields.
import {isPersistedBuilderProjectId} from './project-id-contract.js';
import {inspectStableProjectRevision} from './project-revision-contract.js';
import {reviewSavedProjectBuild} from './build-review-pipeline.js';
const deny=reason=>Object.freeze({status:'denied',reason,deployed:false,manifest:null});
export async function reviewBuildWithRevisionGuard({projectId,ownerId}={},dependencies={}) {
 if(!isPersistedBuilderProjectId(projectId)||!isPersistedBuilderProjectId(ownerId))
  return deny('INVALID_PROJECT_IDENTITY');
 if(typeof dependencies.readOwnedRevision!=='function')
  return deny('REVISION_READER_UNAVAILABLE');
 try {
  const before=await dependencies.readOwnedRevision({projectId,ownerId});
  if(!before) return deny('UNVERIFIED_PROJECT_REVISION');
  const review=await reviewSavedProjectBuild({projectId,ownerId},dependencies);
  if(review.status!=='ready-for-review') return review;
  const after=await dependencies.readOwnedRevision({projectId,ownerId});
  const revision=inspectStableProjectRevision(before,after);
  if(!revision.stable) return deny(revision.reason);
  // The revision read and ownership recheck are distinct operations.
  // A final owner check narrows the race window; it is not a transaction.
  if(typeof dependencies.findOwnedProject!=='function')
   return deny('TRUSTED_DEPENDENCIES_UNAVAILABLE');
  const finalOwner=await dependencies.findOwnedProject({projectId,ownerId});
  if(!finalOwner||finalOwner.id!==projectId||finalOwner.ownerId!==ownerId)
   return deny('PROJECT_OWNERSHIP_CHANGED');
  return Object.freeze({...review,reason:'STATIC_REVIEW_REVISION_STABLE',deployed:false});
 } catch {
  return deny('REVISION_REVIEW_UNAVAILABLE');
 }
}

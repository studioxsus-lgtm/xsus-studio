// Trusted XSUS App integration boundary. No deployment or browser-supplied owner IDs.
import {isPersistedBuilderProjectId} from './project-id-contract.js';
import {reviewBuildWithRevisionGuard} from './revision-guarded-build-review.js';
const deny=reason=>Object.freeze({status:'denied',reason,deployed:false,manifest:null});
export function createAuthenticatedProjectReviewer({verifyAccessToken,projectStore,revisionReader,buildFromSavedProject}={}) {
 if(typeof verifyAccessToken!=='function'||typeof projectStore?.findOwnedProject!=='function'||
    typeof revisionReader?.readOwnedRevision!=='function'||typeof buildFromSavedProject!=='function')
  throw new TypeError('Trusted auth, owner-scoped store, revision reader and builder required');
 return Object.freeze({
  async review({accessToken,projectId}={}) {
   if(typeof accessToken!=='string'||accessToken.length<16||accessToken.length>8192||
      !isPersistedBuilderProjectId(projectId)) return deny('INVALID_REVIEW_REQUEST');
   try {
    // verifyAccessToken must cryptographically validate the token (issuer, audience, expiry).
    // The authenticated subject must be a server-verified UUID, never a body ownerId.
    const identity=await verifyAccessToken(accessToken);
    const ownerId=identity?.sub;
    if(!isPersistedBuilderProjectId(ownerId)) return deny('UNAUTHENTICATED');
    return await reviewBuildWithRevisionGuard({projectId,ownerId},{
     findOwnedProject:args=>projectStore.findOwnedProject(args),
     readOwnedRevision:args=>revisionReader.readOwnedRevision(args),
     buildFromSavedProject:args=>buildFromSavedProject(args)
    });
   } catch { return deny('REVIEW_UNAVAILABLE'); }
  }
 });
}

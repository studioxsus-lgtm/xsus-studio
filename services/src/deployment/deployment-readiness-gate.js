// Explicit production readiness gate for XSUS App. Never infer deployment permission
// from a passing static review, a client-supplied flag, or an unverified snapshot.
export function assessDeploymentReadiness({review, snapshotInspection, provenance}={}) {
 const blockers=[];
 if(review?.status!=='ready-for-review'||review?.deployed!==false||
    review?.manifest?.deployable!==false) blockers.push('BUILD_REVIEW_NOT_VERIFIED');
 if(snapshotInspection?.found!==true||snapshotInspection?.supported!==true||
    snapshotInspection?.deployable!==false) blockers.push('SAVED_PROJECT_NOT_VERIFIED');
 if(provenance?.eligible!==true||provenance?.deployable!==false)
  blockers.push('SERVER_PROVENANCE_NOT_VERIFIED');
 // Even when these checks pass, real authorization, artifact provenance,
 // production RLS and target-specific publishing controls are still missing.
 blockers.push('PRODUCTION_DEPLOYMENT_NOT_ENABLED');
 return Object.freeze({readyForDeployment:false,deployed:false,
  blockers:Object.freeze(blockers)});
}

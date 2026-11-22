// Fail-closed provenance gate for a future server-side XSUS App builder.
// A saved browser snapshot is user-controlled content, not a verified artifact source.
// Only a server-side component may supply these attestations after independent checks.
import {isPersistedBuilderProjectId} from './project-id-contract.js';
const HASH=/^[a-f0-9]{64}$/;
export function inspectTrustedBuildSource(source) {
 const valid=source!==null && typeof source==='object' && !Array.isArray(source) &&
   isPersistedBuilderProjectId(source.projectId) &&
   isPersistedBuilderProjectId(source.ownerId) &&
   source.origin==='server-generated' &&
   source.authorizationVerified===true &&
   source.projectRevisionVerified===true &&
   source.builderVersion==='1.0.0' &&
   typeof source.sourceDigest==='string' && HASH.test(source.sourceDigest);
 return Object.freeze({eligible:!!valid,deployable:false,reason:valid?'PROVENANCE_CHECKS_RECORDED':'UNVERIFIED_BUILD_SOURCE'});
}

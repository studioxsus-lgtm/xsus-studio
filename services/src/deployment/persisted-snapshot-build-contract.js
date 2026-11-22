// XSUS App: explicit contract boundary for persisted project snapshots.
// Existing goal/steps/boards/session records are planning state, NOT executable
// application artifacts. Never synthesize HTML/JS from them or trust client files.
export function inspectPersistedBuildSnapshot(snapshot) {
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))
  return Object.freeze({buildable:false,reason:'INVALID_SNAPSHOT'});
 const files=snapshot.buildArtifacts;
 if(!files||typeof files!=='object'||Array.isArray(files))
  return Object.freeze({buildable:false,reason:'NO_TRUSTED_BUILD_ARTIFACTS'});
 // Even if artifacts are present in persisted JSON, provenance cannot be
 // established by a client-editable snapshot. Require server-owned builder.
 return Object.freeze({buildable:false,reason:'SERVER_BUILDER_REQUIRED'});
}

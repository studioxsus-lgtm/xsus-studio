// Read-only, metadata-only inspection of the existing XSUS App account snapshot.
// This is NOT a trusted build artifact extractor. Never logs or returns user content.
export function inspectBuilderSnapshot(snapshot) {
 const valid=!!snapshot && typeof snapshot==='object' && !Array.isArray(snapshot) &&
   snapshot.version===1 && !!snapshot.session && typeof snapshot.session==='object' &&
   !Array.isArray(snapshot.session) && Array.isArray(snapshot.session.messages) &&
   Array.isArray(snapshot.reviews) && Array.isArray(snapshot.boards);
 if(!valid) return Object.freeze({supported:false,hasGeneratedHtml:false,
   hasVerifiedBuildArtifacts:false,deployable:false});
 return Object.freeze({
   supported:true,
   hasGeneratedHtml:typeof snapshot.session.generatedHtml==='string' &&
     snapshot.session.generatedHtml.length>0,
   // Existing snapshots do not establish three independently trusted output files.
   hasVerifiedBuildArtifacts:false,
   deployable:false
 });
}

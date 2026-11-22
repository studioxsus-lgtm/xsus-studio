// Composition root for XSUS App's owner-scoped review. No network client is
// constructed here; the caller must inject a trusted server-side Supabase client.
// The builder is likewise server-owned and never receives browser files.
import {createSupabaseAccessTokenVerifier} from './supabase-access-token-verifier.js';
import {createBuilderProjectStore} from './supabase-project-store.js';
import {createBuilderProjectRevisionReader} from './supabase-project-revision-reader.js';
import {createAuthenticatedProjectReviewer} from './authenticated-project-review.js';

export function createSupabaseProjectReviewIntegration({supabaseClient,buildFromSavedProject}={}) {
 if(typeof buildFromSavedProject!=='function')
  throw new TypeError('A trusted server-side project builder is required');
 const verifyAccessToken=createSupabaseAccessTokenVerifier(supabaseClient);
 const projectStore=createBuilderProjectStore(supabaseClient);
 const revisionReader=createBuilderProjectRevisionReader(supabaseClient);
 const projectReviewer=createAuthenticatedProjectReviewer({
  verifyAccessToken,projectStore,revisionReader,buildFromSavedProject
 });
 return Object.freeze({projectReviewer});
}

/**
 * Hyper v8.2.38 — explicit, server-only integration assembly.
 * No environment reads, no HTTP route registration, no migrations or deployment.
 * Enabling this factory in an isolated test does NOT make it production eligible.
 */
import {createHyperEvidenceOwnerAuthorizer} from "./hyper-v8237-evidence-owner-authorizer.js";
import {createHyperAppBackendComposition} from "./hyper-v8234-backend-composition.js";
import {createHyperNodeRuntimeRoute} from "./hyper-v8235-node-runtime-route.js";

export const HYPER_APP_RUNTIME_ASSEMBLY_VERSION="8.2.38";

export function createHyperAppRuntimeAssembly({
  supabaseUrl,publishableKey,serviceRoleKey,evidenceKey,evidenceKeyId,
  fetchImpl=globalThis.fetch,enabled=false
}={}) {
  const active=enabled===true;
  const owner=createHyperEvidenceOwnerAuthorizer({
    url:supabaseUrl,serviceRoleKey,fetchImpl,enabled:active
  });
  const composition=createHyperAppBackendComposition({
    supabaseUrl,publishableKey,serviceRoleKey,evidenceKey,evidenceKeyId,
    fetchImpl,enabled:active,
    authorizeEvidenceOwner:({userId,observationId})=>
      owner.authorizeEvidenceOwner({userId,observationId})
  });
  const route=createHyperNodeRuntimeRoute({composition,enabled:active});
  return Object.freeze({
    version:HYPER_APP_RUNTIME_ASSEMBLY_VERSION,
    path:route.path,
    enabled:active,
    productionEligible:false,
    // The caller must independently mount the route. Nothing is mounted here.
    handle:(request,response)=>route.handle(request,response)
  });
}

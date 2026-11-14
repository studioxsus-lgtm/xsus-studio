/**
 * Hyper v8.2.34 — XSUS App backend composition, server-only.
 * No route registration, migrations, production activation or secret exposure.
 * Ownership authorization MUST be supplied by a trusted server-side provider.
 */
import { createHyperTrustedAtomicIntegration } from "./hyper-v8226-trusted-atomic-integration.js";
import { createHyperAppIntegrationBridge } from "./hyper-v8230-app-integration-bridge.js";
import { createHyperAppBackendHandler } from "./hyper-v8231-backend-handler.js";
import { createHyperAuthenticatedApiAdapter } from "./hyper-v8232-authenticated-api-adapter.js";
import { createHyperSupabaseAuthVerifier } from "./hyper-v8233-supabase-auth-verifier.js";

export const HYPER_BACKEND_COMPOSITION_VERSION = "8.2.34";

export function createHyperAppBackendComposition({
  supabaseUrl, publishableKey, serviceRoleKey, evidenceKey, evidenceKeyId,
  authorizeEvidenceOwner, fetchImpl, enabled = false
} = {}) {
  if (typeof authorizeEvidenceOwner !== "function")
    throw new TypeError("A server-side evidence ownership authorizer is required.");
  const active = enabled === true;
  const auth = createHyperSupabaseAuthVerifier({
    url: supabaseUrl, apiKey: publishableKey, fetchImpl, enabled: active
  });
  const storage = createHyperTrustedAtomicIntegration({
    url: supabaseUrl, serviceRoleKey, key: evidenceKey, keyId: evidenceKeyId,
    fetchImpl, enabled: active
  });
  const bridge = createHyperAppIntegrationBridge({
    storage, enabled: active,
    authorize: (context, action) =>
      action === "evidence.verify" &&
      context?.verified === true &&
      context?.source === "server-verified-principal" &&
      typeof context.userId === "string"
  });
  const backendHandler = createHyperAppBackendHandler({
    bridge, enabled: active,
    authorizeUser: async ({userId, action, observationId}) => {
      if (action !== "evidence.verify") return false;
      try {
        return (await authorizeEvidenceOwner({userId, observationId})) === true;
      } catch { return false; }
    }
  });
  const api = createHyperAuthenticatedApiAdapter({
    backendHandler,
    verifyBearerToken: token => auth.verifyBearerToken(token),
    enabled: active
  });
  return Object.freeze({
    version: HYPER_BACKEND_COMPOSITION_VERSION,
    productionEligible: false,
    handle: request => api.handle(request)
  });
}

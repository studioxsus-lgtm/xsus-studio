/**
 * Internal XSUS App -> Supabase Auth -> signed Hyper evidence -> atomic owner RPC.
 * Server-only. Never mount directly as an HTTP route or trust client user IDs.
 * Disabled by default; no production activation implied.
 */
import { createHyperSupabaseAuthVerifier } from "./hyper-v8233-supabase-auth-verifier.js";
import { createHyperOwnedEvidenceService } from "./hyper-owned-evidence-service.js";

export function createHyperAuthenticatedEvidenceService({
  url, publishableKey, serviceRoleKey, key, keyId,
  fetchImpl = globalThis.fetch, enabled = false
} = {}) {
  const active = enabled === true;
  const auth = createHyperSupabaseAuthVerifier({
    url, apiKey: publishableKey, fetchImpl, enabled: active
  });
  const evidence = createHyperOwnedEvidenceService({
    url, serviceRoleKey, key, keyId, fetchImpl, enabled: active
  });
  return Object.freeze({
    productionEligible: false,
    async create({ accessToken, input } = {}) {
      if (!active) return Object.freeze({ stored: false, reason: "SERVICE_DISABLED" });
      const principal = await auth.verifyBearerToken(accessToken);
      if (principal.verified !== true)
        return Object.freeze({ stored: false, reason: "UNAUTHENTICATED" });
      return evidence.create({
        input,
        verifiedPrincipal: Object.freeze({
          verified: true,
          source: "server-verified-principal",
          userId: principal.userId
        })
      });
    }
  });
}

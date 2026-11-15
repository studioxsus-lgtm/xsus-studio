/**
 * Disabled-by-default, authenticated, read-only Hyper infrastructure diagnostic.
 * No production writes, owner lookups, secret values, or user data in output.
 * Authentication is mandatory even when the route flag is enabled.
 */
import { createHyperSupabaseAuthVerifier } from "./hyper-v8233-supabase-auth-verifier.js";

export function createHyperReadinessDiagnostic({ env = {}, fetchImpl = globalThis.fetch, enabled = false } = {}) {
  const active = enabled === true;
  return Object.freeze({
    path: "/api/xsus-app/hyper/readiness",
    async handle({ method, authorization } = {}) {
      if (!active) return { status: 503, body: { ok: false, code: "DIAGNOSTIC_DISABLED" } };
      if (method !== "GET") return { status: 405, body: { ok: false, code: "METHOD_NOT_ALLOWED" } };
      const match = typeof authorization === "string" &&
        /^Bearer ([A-Za-z0-9._~-]{16,4096})$/.exec(authorization);
      if (!match) return { status: 401, body: { ok: false, code: "UNAUTHENTICATED" } };
      try {
        const verifier = createHyperSupabaseAuthVerifier({
          url: env.SUPABASE_URL, apiKey: env.SUPABASE_ANON_KEY,
          fetchImpl, enabled: true
        });
        const principal = await verifier.verifyBearerToken(match[1]);
        if (principal?.verified !== true) return { status: 401, body: { ok: false, code: "UNAUTHENTICATED" } };
      } catch {
        return { status: 503, body: { ok: false, code: "DIAGNOSTIC_UNAVAILABLE" } };
      }
      const tables = ["hyper_runtime_evidence_bundles", "hyper_evidence_owners"];
      const checks = {};
      for (const table of tables) {
        try {
          const url = new URL("/rest/v1/" + table + "?select=observation_id&limit=0", env.SUPABASE_URL);
          const response = await fetchImpl(url.toString(), {
            method: "GET", redirect: "error",
            headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY },
            signal: AbortSignal.timeout(8000)
          });
          checks[table] = response.ok === true;
        } catch { checks[table] = false; }
      }
      const ok = Object.values(checks).every(Boolean);
      return { status: ok ? 200 : 503, body: {
        ok, mode: "READ_ONLY", code: ok ? "TABLES_REACHABLE" : "TABLES_UNAVAILABLE",
        tables: checks, evidenceRouteEnabled: env.XSUS_HYPER_EVIDENCE_ROUTE_ENABLED === "true",
        integrationVerified: false
      } };
    }
  });
}

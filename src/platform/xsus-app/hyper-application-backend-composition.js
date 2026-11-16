/**
 * XSUS App -> Hyper application composition (server-only).
 * Integrates Supabase Auth, project ownership, and authorized plan/build.
 * No public route is mounted and no executor is provided by default.
 * Enable only after real project schema, RLS and Hyper executors are verified.
 */
import { createHyperSupabaseAuthVerifier } from "./hyper-v8233-supabase-auth-verifier.js";
import { createHyperProjectOwnerReader } from "./hyper-project-owner-reader.js";
import { createHyperApplicationDispatcher } from "./xsus-hyper-application-dispatcher.js";
import { createHyperApplicationHttpHandler } from "./xsus-hyper-application-http.js";

export function createHyperApplicationBackendComposition({
  supabaseUrl, publishableKey, serviceRoleKey, fetchImpl,
  authorizeOperation, planApplication, buildApplication,
  enabled = false
} = {}) {
  if (typeof authorizeOperation !== "function" ||
      typeof planApplication !== "function" ||
      typeof buildApplication !== "function")
    throw new TypeError("Trusted Hyper application operations are required.");

  const active = enabled === true;
  const auth = createHyperSupabaseAuthVerifier({
    url: supabaseUrl, apiKey: publishableKey, fetchImpl, enabled: active
  });
  const getProjectOwner = createHyperProjectOwnerReader({
    url: supabaseUrl, serviceRoleKey, fetchImpl
  });
  const dispatcher = createHyperApplicationDispatcher({
    verifyAccessToken: async token => {
      const verified = await auth.verifyBearerToken(token);
      return verified?.verified === true ? { id: verified.userId } : null;
    },
    getProjectOwner,
    authorizeOperation: async context => {
      if (!active) return false;
      try { return (await authorizeOperation(context)) === true; }
      catch { return false; }
    },
    planApplication, buildApplication
  });
  const handler = createHyperApplicationHttpHandler({ dispatcher });
  const unavailable = () => Object.freeze({
    status: 503,
    headers: Object.freeze({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }),
    body: Object.freeze({ ok: false, code: "HYPER_APPLICATION_UNAVAILABLE" })
  });

  return Object.freeze({
    productionEligible: false,
    enabled: active,
    handle: request => active ? handler(request) : unavailable()
  });
}

/**
 * Hyper v8.2.33 — server-side Supabase Auth token verification.
 * Uses Supabase Auth /auth/v1/user to validate the bearer with the provider.
 * Not mounted to a public route, disabled by default.
 * Supabase anon/publishable API key is server config; never accept from client.
 */
export const HYPER_SUPABASE_AUTH_VERSION = "8.2.33";
const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createHyperSupabaseAuthVerifier({
  url, apiKey, fetchImpl = globalThis.fetch, enabled = false
} = {}) {
  let parsed;
  try { parsed = new URL(url); } catch {
    throw new TypeError("Hyper Supabase Auth configuration invalid.");
  }
  if (parsed.protocol !== "https:" ||
      !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) ||
      parsed.port || parsed.username || parsed.password ||
      (parsed.pathname !== "/" && parsed.pathname !== "") ||
      parsed.search || parsed.hash ||
      typeof apiKey !== "string" || !apiKey.trim() ||
      typeof fetchImpl !== "function")
    throw new TypeError("Hyper Supabase Auth configuration invalid.");
  const endpoint = parsed.origin + "/auth/v1/user";
  return Object.freeze({
    version: HYPER_SUPABASE_AUTH_VERSION,
    async verifyBearerToken(token) {
      if (enabled !== true) return Object.freeze({ verified:false });
      if (typeof token !== "string" || token.length < 16 || token.length > 4096 ||
          !/^[A-Za-z0-9._~-]+$/.test(token))
        return Object.freeze({ verified:false });
      try {
        const response = await fetchImpl(endpoint, {
          method:"GET", headers:{
            apikey:apiKey, Authorization:"Bearer "+token,
            Accept:"application/json"
          },
          redirect:"error", signal:AbortSignal.timeout(10000)
        });
        if (!response?.ok) return Object.freeze({verified:false});
        const user = await response.json();
        if (!user || typeof user.id !== "string" || !USER_ID.test(user.id))
          return Object.freeze({verified:false});
        return Object.freeze({verified:true,userId:user.id});
      } catch {
        return Object.freeze({verified:false});
      }
    }
  });
}

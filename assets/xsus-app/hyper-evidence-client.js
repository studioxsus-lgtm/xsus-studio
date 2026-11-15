/**
 * XSUS App → Hyper XSUS Core evidence verification client.
 * Uses the authenticated Node backend; never accesses Supabase service-role APIs.
 * Read-only, opt-in and independent of XSUS AI Core.
 */
const OBSERVATION_ID = /^[A-Za-z0-9_-]{1,128}$/;
const DEFAULT_PATH = "/api/xsus-app/hyper/evidence/verify";

export function createHyperEvidenceClient({
  apiBaseUrl,
  getAccessToken,
  fetchImpl = globalThis.fetch,
  enabled = false
} = {}) {
  if (typeof getAccessToken !== "function" || typeof fetchImpl !== "function") {
    throw new TypeError("An access-token provider and fetch implementation are required.");
  }
  let endpoint;
  try {
    const base = new URL(apiBaseUrl);
    if (base.protocol !== "https:" || base.username || base.password ||
        base.search || base.hash || base.pathname !== "/") {
      throw new Error("invalid base URL");
    }
    endpoint = new URL(DEFAULT_PATH, base);
  } catch {
    throw new TypeError("Hyper API base URL must be a valid HTTPS origin.");
  }
  return Object.freeze({
    enabled: enabled === true,
    async verify(observationId) {
      if (enabled !== true) return { ok: false, code: "CLIENT_DISABLED" };
      if (typeof observationId !== "string" || !OBSERVATION_ID.test(observationId)) {
        return { ok: false, code: "INVALID_OBSERVATION_ID" };
      }
      try {
        const token = await getAccessToken();
        if (typeof token !== "string" || !token.trim() ||
            /[\r\n\s]/.test(token)) {
          return { ok: false, code: "UNAUTHENTICATED" };
        }
        const response = await fetchImpl(endpoint.href, {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ action: "evidence.verify", observationId }),
          cache: "no-store",
          redirect: "error"
        });
        if (!response || typeof response.status !== "number") {
          return { ok: false, code: "SERVICE_UNAVAILABLE" };
        }
        if (response.status === 401) return { ok: false, code: "UNAUTHENTICATED" };
        if (response.status === 403) return { ok: false, code: "FORBIDDEN" };
        if (response.status === 503) return { ok: false, code: "SERVICE_DISABLED_OR_UNAVAILABLE" };
        if (response.status !== 200) return { ok: false, code: "VERIFICATION_FAILED" };
        const data = await response.json();
        if (data?.ok !== true || data?.verified !== true ||
            data?.observationId !== observationId) {
          return { ok: false, code: "INVALID_SERVER_RESPONSE" };
        }
        return {
          ok: true, verified: true, observationId,
          runtimeAttested: data.runtimeAttested === true,
          productionEligible: data.productionEligible === true
        };
      } catch {
        return { ok: false, code: "NETWORK_ERROR" };
      }
    }
  });
}

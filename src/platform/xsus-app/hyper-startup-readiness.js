/**
 * Safe, read-only Render startup diagnostics.
 * Logs only predefined categories and HTTP status codes; never log response
 * bodies, URLs, user records, request headers or credentials.
 */
export async function checkHyperStartupReadiness({
  env = {}, fetchImpl = globalThis.fetch, timeoutMs = 5000
} = {}) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (typeof url !== "string" || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)
      || typeof key !== "string" || !key.trim()) {
    return Object.freeze({ status: "NOT_CONFIGURED", tablesReachable: false,
      checks: Object.freeze({}) });
  }
  const checks = {};
  for (const table of ["hyper_runtime_evidence_bundles", "hyper_evidence_owners"]) {
    try {
      const endpoint = new URL("/rest/v1/" + table + "?select=observation_id&limit=0", url);
      const response = await fetchImpl(endpoint.toString(), {
        method: "GET", redirect: "error",
        headers: { apikey: key, Authorization: "Bearer " + key, Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs)
      });
      const status = response?.status;
      const httpStatus = Number.isInteger(status) && status >= 100 && status <= 599
        ? status : null;
      checks[table] = Object.freeze({
        reachable: response?.ok === true,
        category: response?.ok === true ? "OK"
          : httpStatus === 401 || httpStatus === 403 ? "AUTHORIZATION"
          : httpStatus === 404 ? "TABLE_OR_ENDPOINT_NOT_FOUND"
          : httpStatus === 400 ? "BAD_REQUEST_OR_SCHEMA"
          : httpStatus === 429 ? "RATE_LIMITED"
          : httpStatus !== null && httpStatus >= 500 ? "UPSTREAM_ERROR"
          : "HTTP_ERROR",
        httpStatus
      });
    } catch (error) {
      checks[table] = Object.freeze({
        reachable: false,
        category: error?.name === "TimeoutError" || error?.name === "AbortError"
          ? "TIMEOUT" : "NETWORK_OR_TLS_ERROR",
        httpStatus: null
      });
    }
  }
  const tablesReachable = Object.values(checks).every(check => check.reachable);
  return Object.freeze({
    status: tablesReachable ? "TABLES_REACHABLE" : "TABLES_UNAVAILABLE",
    tablesReachable,
    checks: Object.freeze(checks)
  });
}

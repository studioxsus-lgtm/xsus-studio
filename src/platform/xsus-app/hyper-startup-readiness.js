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
  // Read-only REST gateway probe, separate from table permissions.
  try {
    const response = await fetchImpl(new URL("/rest/v1/", url).toString(), {
      method: "GET", redirect: "error",
      headers: { apikey: key, Authorization: "Bearer " + key, Accept: "application/openapi+json" },
      signal: AbortSignal.timeout(timeoutMs)
    });
    checks.restGateway = Object.freeze({
      reachable: response?.ok === true,
      httpStatus: Number.isInteger(response?.status) ? response.status : null,
      category: response?.ok === true ? "OK"
        : [401,403].includes(response?.status) ? "GATEWAY_AUTHORIZATION"
        : "GATEWAY_UNAVAILABLE"
    });
  } catch (error) {
    checks.restGateway = Object.freeze({
      reachable: false, httpStatus: null,
      category: ["TimeoutError", "AbortError"].includes(error?.name)
        ? "TIMEOUT" : "NETWORK_OR_TLS_ERROR"
    });
  }
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
  const tablesReachable = ["hyper_runtime_evidence_bundles", "hyper_evidence_owners"].every(table => checks[table].reachable);
  const gatewayReachable = checks.restGateway.reachable;
  return Object.freeze({
    status: tablesReachable ? "TABLES_REACHABLE" : "TABLES_UNAVAILABLE",
    tablesReachable,
    gatewayReachable,
    diagnosis: !gatewayReachable ? "CHECK_API_KEY_OR_GATEWAY" : !tablesReachable ? "CHECK_TABLE_PERMISSIONS_OR_SCHEMA" : "REST_READS_OK",
    checks: Object.freeze(checks)
  });
}

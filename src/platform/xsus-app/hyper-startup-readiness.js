/**
 * Read-only startup check, intended for Render application logs.
 * No HTTP endpoint, no credentials in output, no database writes.
 */
export async function checkHyperStartupReadiness({
  env = {}, fetchImpl = globalThis.fetch, timeoutMs = 5000
} = {}) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (typeof url !== "string" || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)
      || typeof key !== "string" || !key.trim()) {
    return Object.freeze({ status: "NOT_CONFIGURED", tablesReachable: false });
  }
  const tables = ["hyper_runtime_evidence_bundles", "hyper_evidence_owners"];
  const results = [];
  for (const table of tables) {
    try {
      const endpoint = new URL("/rest/v1/" + table + "?select=observation_id&limit=0", url);
      const response = await fetchImpl(endpoint.toString(), {
        method: "GET",
        redirect: "error",
        headers: { apikey: key, Authorization: "Bearer " + key, Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs)
      });
      results.push(response?.ok === true);
    } catch {
      results.push(false);
    }
  }
  return Object.freeze({
    status: results.every(Boolean) ? "TABLES_REACHABLE" : "TABLES_UNAVAILABLE",
    tablesReachable: results.every(Boolean)
  });
}

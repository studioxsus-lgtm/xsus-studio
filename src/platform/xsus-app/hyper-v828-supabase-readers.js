/**
 * XSUS Hyper v8.2.8 — server-only, read-only Supabase REST readers.
 * Requires verified table/column mapping before deployment.
 * Never accept URL, table, credentials, or record ID from an HTTP client.
 */
const IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;
const HTTPS = /^https:\/\/[a-z0-9.-]+(?::443)?\/?$/i;

export const HYPER_SUPABASE_READERS_VERSION = "8.2.8";

export function createHyperSupabaseReader({
  url, serviceRoleKey, table, recordId, idColumn = "id",
  digestColumn = "digest", fetchImpl = globalThis.fetch
} = {}) {
  if (!HTTPS.test(url || "") || !serviceRoleKey ||
      ![table, idColumn, digestColumn].every(v => typeof v === "string" && IDENTIFIER.test(v)) ||
      typeof recordId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(recordId) ||
      typeof fetchImpl !== "function") {
    throw new TypeError("Hyper Supabase reader configuration is invalid.");
  }
  const base = url.replace(/\/$/, "");
  const path = "/rest/v1/" + table +
    "?select=" + encodeURIComponent(idColumn + "," + digestColumn) +
    "&" + idColumn + "=eq." + encodeURIComponent(recordId) + "&limit=2";

  return Object.freeze({
    async read() {
      try {
        const response = await fetchImpl(base + path, {
          method: "GET",
          headers: {
            apikey: serviceRoleKey,
            Authorization: "Bearer " + serviceRoleKey,
            Accept: "application/json"
          },
          signal: AbortSignal.timeout(10000)
        });
        if (!response?.ok) throw Error("read failed");
        const rows = await response.json();
        if (!Array.isArray(rows) || rows.length !== 1 ||
            rows[0]?.[idColumn] !== recordId ||
            typeof rows[0]?.[digestColumn] !== "string" ||
            !rows[0][digestColumn]) throw Error("invalid observation");
        return Object.freeze({
          recordId: rows[0][idColumn],
          digest: rows[0][digestColumn]
        });
      } catch {
        throw new Error("Hyper Supabase read verification failed.");
      }
    }
  });
}

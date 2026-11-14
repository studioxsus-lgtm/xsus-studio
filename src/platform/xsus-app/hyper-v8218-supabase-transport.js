/**
 * Hyper v8.2.18 — Supabase runtime evidence REST transport.
 * Server-only, disabled by default. Never accept URL, key or table from client.
 * Insert-only POST and read-only GET. No upsert, update or delete.
 * Requires separately reviewed schema, RLS, grants and server credentials.
 */
export const HYPER_SUPABASE_TRANSPORT_VERSION = "8.2.18";
const HTTPS = /^https:\/\/[a-z0-9.-]+(?::443)?\/?$/i;
const ID = /^[A-Za-z0-9_-]{1,128}$/;

export function createHyperSupabaseTransport({
  url, serviceRoleKey, enabled = false, fetchImpl = globalThis.fetch
} = {}) {
  if (!HTTPS.test(url || "") || typeof serviceRoleKey !== "string" ||
      !serviceRoleKey.trim() || typeof fetchImpl !== "function")
    throw new TypeError("Hyper Supabase transport configuration invalid.");
  const endpoint = url.replace(/\/$/, "") + "/rest/v1/hyper_runtime_evidence";
  const headers = {
    apikey: serviceRoleKey,
    Authorization: "Bearer " + serviceRoleKey,
    Accept: "application/json"
  };
  return Object.freeze({
    version: HYPER_SUPABASE_TRANSPORT_VERSION,
    async insertRow(row) {
      if (enabled !== true) throw Error("Hyper persistence disabled.");
      if (!row || !ID.test(row.observation_id || ""))
        throw Error("Hyper observation invalid.");
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json",
            Prefer: "return=representation" },
          body: JSON.stringify(row),
          signal: AbortSignal.timeout(10000)
        });
        if (!response?.ok) throw Error("write failed");
        const result = await response.json();
        if (!Array.isArray(result) || result.length !== 1 ||
            result[0]?.observation_id !== row.observation_id)
          throw Error("insert not confirmed");
        return Object.freeze({ inserted: true, observationId: row.observation_id });
      } catch {
        throw new Error("Hyper Supabase persistence write failed.");
      }
    },
    async selectRow(observationId) {
      if (enabled !== true) throw Error("Hyper persistence disabled.");
      if (!ID.test(observationId || "")) throw Error("Hyper observation ID invalid.");
      const query = "?observation_id=eq." + encodeURIComponent(observationId) + "&limit=2";
      try {
        const response = await fetchImpl(endpoint + query, {
          method: "GET", headers, signal: AbortSignal.timeout(10000)
        });
        if (!response?.ok) throw Error("read failed");
        const rows = await response.json();
        if (!Array.isArray(rows) || rows.length !== 1 ||
            rows[0]?.observation_id !== observationId)
          throw Error("observation not unique");
        return Object.freeze({ ...rows[0] });
      } catch {
        throw new Error("Hyper Supabase persistence read failed.");
      }
    }
  });
}

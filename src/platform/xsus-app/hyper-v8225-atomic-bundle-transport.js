/**
 * Hyper v8.2.25 — server-only Supabase atomic bundle transport.
 * Disabled by default; no environment discovery, public route or deployment.
 * A service_role key may bypass RLS: independent privilege review is required.
 */
import {
  prepareHyperAtomicBundle, parseHyperAtomicBundle
} from "./hyper-v8224-atomic-bundle-contract.js";

export const HYPER_ATOMIC_BUNDLE_TRANSPORT_VERSION = "8.2.25";
const ID = /^[A-Za-z0-9_-]{1,128}$/;

export function createHyperAtomicBundleTransport({
  url, serviceRoleKey, enabled = false, fetchImpl = globalThis.fetch
} = {}) {
  if (typeof url !== "string" || typeof serviceRoleKey !== "string" ||
      !serviceRoleKey.trim() || typeof fetchImpl !== "function")
    throw new TypeError("Hyper atomic transport configuration invalid.");
  let parsed;
  try { parsed = new URL(url); } catch {
    throw new TypeError("Hyper atomic transport URL invalid.");
  }
  if (parsed.protocol !== "https:" ||
      !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) ||
      parsed.port || parsed.username || parsed.password ||
      (parsed.pathname !== "/" && parsed.pathname !== "") ||
      parsed.search || parsed.hash)
    throw new TypeError("Hyper atomic transport URL invalid.");

  const endpoint = parsed.origin + "/rest/v1/hyper_runtime_evidence_bundles";
  const headers = Object.freeze({
    apikey: serviceRoleKey, Authorization: "Bearer " + serviceRoleKey,
    Accept: "application/json"
  });
  return Object.freeze({
    version: HYPER_ATOMIC_BUNDLE_TRANSPORT_VERSION,
    async insertBundle(bundle) {
      if (enabled !== true) throw Error("Hyper atomic transport disabled.");
      const row = prepareHyperAtomicBundle(bundle);
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json",
            Prefer: "return=representation" },
          body: JSON.stringify(row),
          signal: AbortSignal.timeout(10000),
          redirect: "error"
        });
        if (!response?.ok) throw Error("insert failed");
        const records = await response.json();
        if (!Array.isArray(records) || records.length !== 1)
          throw Error("insert not confirmed");
        const confirmed = parseHyperAtomicBundle(records[0]);
        if (Object.keys(row).some(k => confirmed.row[k] !== row[k] &&
            records[0][k] !== row[k]))
          throw Error("insert mismatch");
        if (records[0].observation_id !== row.observation_id ||
            records[0].authentication_tag !== row.authentication_tag ||
            records[0].evidence_digest !== row.evidence_digest ||
            records[0].envelope_key_id !== row.envelope_key_id)
          throw Error("insert mismatch");
        return Object.freeze({ inserted: true, observationId: row.observation_id });
      } catch {
        throw Error("Hyper atomic bundle write failed.");
      }
    },
    async readBundle(observationId) {
      if (enabled !== true) throw Error("Hyper atomic transport disabled.");
      if (typeof observationId !== "string" || !ID.test(observationId))
        throw Error("Hyper observation ID invalid.");
      try {
        const response = await fetchImpl(
          endpoint + "?observation_id=eq." + encodeURIComponent(observationId) + "&limit=2",
          { method: "GET", headers, signal: AbortSignal.timeout(10000), redirect: "error" }
        );
        if (!response?.ok) throw Error("read failed");
        const records = await response.json();
        if (!Array.isArray(records) || records.length !== 1 ||
            records[0]?.observation_id !== observationId)
          throw Error("read mismatch");
        return parseHyperAtomicBundle(records[0]);
      } catch {
        throw Error("Hyper atomic bundle read failed.");
      }
    }
  });
}

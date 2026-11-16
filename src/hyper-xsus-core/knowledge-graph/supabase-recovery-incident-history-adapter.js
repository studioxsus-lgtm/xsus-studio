/**
 * Hyper XSUS Core — Supabase Recovery Incident History Adapter v1.0.0
 * SERVER ONLY. Inject a trusted Supabase client; never ship service-role keys.
 * Requires SQL contract xsus_recovery_incident_history_cas(scope, revision, snapshot).
 * RLS / RPC permissions must be configured separately before production use.
 */
export const SUPABASE_RECOVERY_INCIDENT_HISTORY_ADAPTER_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const copy = value => JSON.parse(JSON.stringify(value));
function storageError(operation) {
  const error = new Error("Supabase recovery incident history " + operation + " failed.");
  error.code = "RECOVERY_INCIDENT_HISTORY_STORAGE_ERROR";
  return error;
}
export function createSupabaseRecoveryIncidentHistoryAdapter({ client } = {}) {
  if (!client || typeof client.from !== "function" || typeof client.rpc !== "function") {
    throw new TypeError("A trusted Supabase client with from() and rpc() is required.");
  }
  function checkScope(scope) {
    if (typeof scope !== "string" || !ID.test(scope)) {
      throw new TypeError("Invalid recovery incident history scope.");
    }
  }
  async function read(scope) {
    checkScope(scope);
    const query = client.from("xsus_recovery_incident_histories");
    if (!query || typeof query.select !== "function") {
      throw new TypeError("Invalid Supabase recovery incident history query.");
    }
    const selected = query.select("snapshot").eq("scope", scope);
    if (!selected || typeof selected.maybeSingle !== "function") {
      throw new TypeError("Supabase client must support maybeSingle().");
    }
    let result;
    try { result = await selected.maybeSingle(); }
    catch { throw storageError("read"); }
    if (!result || result.error) throw storageError("read");
    if (result.data === null) return { revision: 0, entries: [] };
    const snapshot = result.data?.snapshot;
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) ||
        !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 ||
        !Array.isArray(snapshot.entries)) {
      throw storageError("integrity");
    }
    return copy(snapshot);
  }
  async function compareAndSwap(scope, expectedRevision, next) {
    checkScope(scope);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 ||
        !next || typeof next !== "object" || Array.isArray(next) ||
        next.revision !== expectedRevision + 1 || !Array.isArray(next.entries)) {
      throw new TypeError("Invalid recovery incident history CAS arguments.");
    }
    let result;
    try {
      result = await client.rpc("xsus_recovery_incident_history_cas", {
        p_scope: scope, p_expected_revision: expectedRevision, p_snapshot: copy(next)
      });
    } catch { throw storageError("compare-and-swap"); }
    if (!result || result.error) throw storageError("compare-and-swap");
    if (typeof result.data !== "boolean") throw storageError("CAS response");
    return result.data;
  }
  return Object.freeze({
    version: SUPABASE_RECOVERY_INCIDENT_HISTORY_ADAPTER_VERSION, read, compareAndSwap
  });
}

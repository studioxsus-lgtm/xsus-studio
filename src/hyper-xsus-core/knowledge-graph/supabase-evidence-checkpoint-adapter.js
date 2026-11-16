/**
 * Hyper XSUS Core — Supabase Evidence Checkpoint Adapter v1.0.0
 *
 * Server-only adapter for createKnowledgeEvidenceCheckpointStore.
 * Requires a trusted Supabase service-role client supplied by the backend.
 * Never embed service-role credentials in browser code or public bundles.
 * The SQL migration provides atomic compare-and-swap via a PostgreSQL RPC.
 */
export const SUPABASE_EVIDENCE_ADAPTER_VERSION = "1.0.0";
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const copy = value => JSON.parse(JSON.stringify(value));

export function createSupabaseEvidenceCheckpointAdapter({
  client,
  rpcName = "xsus_evidence_checkpoint_cas",
  tableName = "xsus_evidence_checkpoints"
} = {}) {
  if (!client || typeof client.from !== "function" || typeof client.rpc !== "function") {
    throw new TypeError("A trusted Supabase client with from() and rpc() is required.");
  }
  if (rpcName !== "xsus_evidence_checkpoint_cas" ||
      tableName !== "xsus_evidence_checkpoints") {
    throw new TypeError("Custom RPC/table names are not supported by the verified SQL contract.");
  }
  function keyCheck(key) {
    if (typeof key !== "string" || !IDENTIFIER.test(key)) {
      throw new TypeError("Invalid evidence checkpoint key.");
    }
  }
  function errorCheck(error, operation) {
    if (error) {
      const failure = new Error("Supabase evidence checkpoint " + operation + " failed.");
      failure.code = "EVIDENCE_STORAGE_ERROR";
      throw failure;
    }
  }
  async function read(key) {
    keyCheck(key);
    const query = client.from(tableName);
    if (!query || typeof query.select !== "function") {
      throw new TypeError("Invalid Supabase table query interface.");
    }
    const selection = query.select("checkpoint").eq("checkpoint_key", key);
    if (!selection || typeof selection.maybeSingle !== "function") {
      throw new TypeError("Supabase client must support maybeSingle().");
    }
    const { data, error } = await selection.maybeSingle();
    errorCheck(error, "read");
    if (data === null) return null;
    if (!data || !data.checkpoint || typeof data.checkpoint !== "object" ||
        Array.isArray(data.checkpoint)) {
      throw new Error("Invalid stored evidence checkpoint.");
    }
    return copy(data.checkpoint);
  }
  async function compareAndSwap(key, expectedRevision, next) {
    keyCheck(key);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 ||
        !next || typeof next !== "object" || Array.isArray(next) ||
        !Number.isSafeInteger(next.revision) || next.revision !== expectedRevision + 1) {
      throw new TypeError("Invalid evidence checkpoint CAS arguments.");
    }
    const { data, error } = await client.rpc(rpcName, {
      p_key: key, p_expected_revision: expectedRevision, p_checkpoint: copy(next)
    });
    errorCheck(error, "compare-and-swap");
    if (typeof data !== "boolean") {
      throw new Error("Invalid Supabase evidence checkpoint CAS response.");
    }
    return data;
  }
  return Object.freeze({ read, compareAndSwap });
}

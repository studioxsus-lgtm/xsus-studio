/**
 * Hyper XSUS Core — Recovery Journal Consistency Guard v1.0.0
 * Read-only consistency gate. Journal must be hash-chain verified by its
 * own inspect implementation; an external trusted journal head is required
 * to detect full-history substitution. No automatic repair or writes.
 */
export const RECOVERY_JOURNAL_GUARD_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HASH = /^[a-f0-9]{64}$/;
const freeze = x => Object.freeze(x);
export function createRecoveryJournalConsistencyGuard({ journal, state, anchor } = {}) {
  if (!journal || typeof journal.inspect !== "function" ||
      !state || typeof state.get !== "function" ||
      !anchor || typeof anchor.inspect !== "function") {
    throw new TypeError("Recovery guard requires journal, state and anchor.");
  }
  async function inspect({ id, key, expectedJournalHead } = {}) {
    if (typeof id !== "string" || !ID.test(id) ||
        typeof key !== "string" || !ID.test(key) ||
        typeof expectedJournalHead !== "string" || !HASH.test(expectedJournalHead)) {
      throw new TypeError("Recovery guard requires a trusted journal head.");
    }
    let snapshot, record, anchorState;
    try {
      [snapshot, record, anchorState] = await Promise.all([
        journal.inspect({ expectedHeadHash: expectedJournalHead }),
        state.get(id), anchor.inspect(key)
      ]);
    } catch {
      return freeze({ status: "integrity-unavailable", safeToExecute: false, id, key });
    }
    if (!record || record.id !== id || record.key !== key ||
        !Array.isArray(snapshot.records) ||
        typeof anchorState.headHash !== "string" || !HASH.test(anchorState.headHash)) {
      return freeze({ status: "invalid-state", safeToExecute: false, id, key });
    }
    const actions = snapshot.records.filter(entry => entry.requestId === id).map(entry => entry.action);
    const proposed = actions.indexOf("proposed");
    const approved = actions.indexOf("approved");
    const executed = actions.indexOf("executed");
    const revoked = actions.indexOf("revoked");
    const failed = actions.indexOf("failed");
    if (proposed !== 0 || approved < 1 || approved <= proposed ||
        revoked !== -1 || failed !== -1 || executed !== -1 ||
        actions.filter(action => action === "proposed").length !== 1 ||
        actions.filter(action => action === "approved").length !== 1) {
      return freeze({ status: "journal-inconsistent", safeToExecute: false, id, key });
    }
    if (record.status !== "approved" || anchorState.headHash !== record.trustedHead) {
      return freeze({ status: "state-diverged", safeToExecute: false, id, key });
    }
    return freeze({ status: "verified", safeToExecute: true, id, key,
      journalHead: snapshot.headHash, anchorHead: anchorState.headHash });
  }
  return freeze({ version: RECOVERY_JOURNAL_GUARD_VERSION, inspect });
}

/**
 * Hyper XSUS Core — Recovery Evidence Snapshot Gate v1.0.0
 * Pins a state revision, independent trusted journal head, verified journal
 * head, and fenced anchor revision/head per tenant-scoped recovery key.
 * Read-only optimistic consistency check; not a cross-store transaction.
 * External trust head MUST be maintained independently of the journal.
 */
export const RECOVERY_EVIDENCE_SNAPSHOT_GATE_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HASH = /^[a-f0-9]{64}$/;
const freeze = x => Object.freeze(x);
const changed = () => Object.assign(
  new Error("Recovery evidence snapshot changed; restart audit."),
  { code: "RECOVERY_EVIDENCE_SNAPSHOT_CHANGED" }
);
export function createRecoveryEvidenceSnapshotGate({
  state, journal, anchor, trustedJournalHead, authorize
} = {}) {
  if (!state || typeof state.snapshot !== "function" ||
      !journal || typeof journal.inspect !== "function" ||
      !anchor || typeof anchor.inspect !== "function" ||
      typeof trustedJournalHead !== "function" ||
      typeof authorize !== "function") {
    throw new TypeError("Recovery evidence gate requires state, journal, anchor, trust and authorization.");
  }
  const issued = new WeakMap();
  async function sample(key) {
    const before = await state.snapshot();
    const trusted = await trustedJournalHead(key);
    if (!Number.isSafeInteger(before?.revision) || before.revision < 0 ||
        typeof trusted !== "string" || !HASH.test(trusted)) {
      throw new Error("Invalid recovery evidence baseline.");
    }
    const [history, head, after, trustedAgain] = await Promise.all([
      journal.inspect({ expectedHeadHash: trusted }),
      anchor.inspect(key), state.snapshot(), trustedJournalHead(key)
    ]);
    if (!history || history.headHash !== trusted || !Array.isArray(history.records) ||
        !head || !HASH.test(head.headHash) ||
        !Number.isSafeInteger(head.revision) || head.revision < 0 ||
        !Number.isSafeInteger(head.fencingToken) || head.fencingToken < 0 ||
        after?.revision !== before.revision || trustedAgain !== trusted) {
      throw changed();
    }
    return freeze({
      stateRevision: before.revision, journalHead: trusted,
      anchorRevision: head.revision, anchorHead: head.headHash,
      fencingToken: head.fencingToken
    });
  }
  async function begin({ key, actorId } = {}) {
    if (typeof key !== "string" || !ID.test(key) ||
        typeof actorId !== "string" || !ID.test(actorId) ||
        issued.get(baseline) !== actorId) {
      throw new TypeError("Invalid recovery evidence audit identity.");
    }
    if (await authorize({ action: "audit", actorId, key }) !== true) {
      throw new Error("Recovery evidence audit access denied.");
    }
    const pinned = await sample(key);
    const baseline = freeze({ version: RECOVERY_EVIDENCE_SNAPSHOT_GATE_VERSION, key, ...pinned });
    issued.set(baseline, actorId);
    return baseline;
  }
  async function verify({ baseline, actorId } = {}) {
    if (!baseline || baseline.version !== RECOVERY_EVIDENCE_SNAPSHOT_GATE_VERSION ||
        typeof baseline.key !== "string" || !ID.test(baseline.key) ||
        typeof actorId !== "string" || !ID.test(actorId)) {
      throw new TypeError("Invalid recovery evidence baseline request.");
    }
    if (await authorize({ action: "audit", actorId, key: baseline.key }) !== true) {
      throw new Error("Recovery evidence audit access denied.");
    }
    const current = await sample(baseline.key);
    if (Object.keys(current).some(field => current[field] !== baseline[field])) throw changed();
    return freeze({ consistent: true, key: baseline.key, ...current });
  }
  return freeze({ version: RECOVERY_EVIDENCE_SNAPSHOT_GATE_VERSION, begin, verify });
}

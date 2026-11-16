/**
 * Hyper XSUS Core — Evidence Crash Recovery Inspector v1.0.0
 * Read-only classification of checkpoint/anchor drift. Never automatically
 * advances a trusted anchor: an independently trusted authorization and
 * proof of the interrupted commit are required for that action.
 */
import { restoreKnowledgeChangeEvidenceLedger } from "./knowledge-change-evidence-ledger.js";
import { sha256Hex } from "./portable-sha256.js";

export const EVIDENCE_CRASH_RECOVERY_VERSION = "1.0.0";
const GENESIS = "0".repeat(64);
const HASH = /^[0-9a-f]{64}$/;
const freeze = value => Object.freeze(value);

export function createEvidenceCrashRecoveryInspector({ storage, anchor, key } = {}) {
  if (!storage || typeof storage.read !== "function") throw new TypeError("storage.read is required.");
  if (!anchor || typeof anchor.read !== "function") throw new TypeError("anchor.read is required.");
  if (typeof key !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(key)) {
    throw new TypeError("Invalid evidence recovery key.");
  }
  async function inspect() {
    const [checkpoint, trusted] = await Promise.all([storage.read(key), anchor.read(key)]);
    const anchorHash = trusted === null ? GENESIS : trusted;
    if (typeof anchorHash !== "string" || !HASH.test(anchorHash)) {
      return freeze({ status: "invalid-anchor", safeToWrite: false, key });
    }
    if (checkpoint === null) {
      return freeze({
        status: anchorHash === GENESIS ? "empty" : "missing-checkpoint",
        safeToWrite: anchorHash === GENESIS, key, trustedHead: anchorHash
      });
    }
    if (!checkpoint || typeof checkpoint !== "object" || Array.isArray(checkpoint)) {
      return freeze({ status: "invalid-checkpoint", safeToWrite: false, key });
    }
    try {
      const { checksum, ...body } = checkpoint;
      if (typeof checksum !== "string" || sha256Hex(JSON.stringify(body)) !== checksum ||
          !Number.isSafeInteger(checkpoint.revision) || checkpoint.revision < 1 ||
          !Number.isSafeInteger(checkpoint.recordCount) || checkpoint.recordCount < 1 ||
          !HASH.test(checkpoint.headHash) || !HASH.test(checkpoint.previousHeadHash) ||
          checkpoint.snapshot?.headHash !== checkpoint.headHash ||
          checkpoint.snapshot?.records?.length !== checkpoint.recordCount) {
        throw new Error("Invalid checkpoint metadata.");
      }
      const ledger = restoreKnowledgeChangeEvidenceLedger(checkpoint.snapshot);
      if (!ledger.verify(checkpoint.headHash).valid) throw new Error("Invalid chain.");
      if (checkpoint.headHash === anchorHash) {
        return freeze({
          status: "consistent", safeToWrite: true, key,
          revision: checkpoint.revision, recordCount: checkpoint.recordCount,
          trustedHead: anchorHash, checkpointHead: checkpoint.headHash
        });
      }
      const previousMatches = checkpoint.previousHeadHash === anchorHash;
      return freeze({
        status: previousMatches ? "possible-interrupted-anchor-update" : "divergent-history",
        safeToWrite: false, key, revision: checkpoint.revision,
        recordCount: checkpoint.recordCount, trustedHead: anchorHash,
        checkpointHead: checkpoint.headHash,
        requiresIndependentCommitProof: previousMatches
      });
    } catch {
      return freeze({ status: "invalid-checkpoint", safeToWrite: false, key });
    }
  }
  return freeze({ version: EVIDENCE_CRASH_RECOVERY_VERSION, inspect });
}

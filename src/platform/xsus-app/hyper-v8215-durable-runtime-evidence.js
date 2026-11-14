/**
 * Hyper v8.2.15 — durable runtime evidence read contract.
 * Reads two independently persisted observations; never writes to Supabase.
 * This checks structure/chronology only, not authenticity or durability.
 */
import { compareHyperRuntimeSnapshots } from "./hyper-v8214-runtime-lifecycle.js";

export const HYPER_DURABLE_RUNTIME_EVIDENCE_VERSION = "8.2.15";
const ID = /^[a-zA-Z0-9_-]{1,128}$/;

export function createHyperDurableRuntimeEvidence({
  readBefore, readAfter, expectedBeforeId, expectedAfterId
} = {}) {
  if (typeof readBefore !== "function" || typeof readAfter !== "function" ||
      !ID.test(expectedBeforeId || "") || !ID.test(expectedAfterId || "") ||
      expectedBeforeId === expectedAfterId)
    throw new TypeError("Durable runtime reader configuration invalid.");

  return Object.freeze({
    version: HYPER_DURABLE_RUNTIME_EVIDENCE_VERSION,
    async inspect() {
      const blockers = [];
      try {
        const before = await readBefore();
        const after = await readAfter();
        if (!before || !after || before.observationId !== expectedBeforeId ||
            after.observationId !== expectedAfterId ||
            before.observationId === after.observationId)
          blockers.push("DURABLE_OBSERVATION_ID_MISMATCH");
        const comparison = compareHyperRuntimeSnapshots(before, after);
        blockers.push(...comparison.blockers);
      } catch {
        blockers.push("DURABLE_RUNTIME_READ_FAILED");
      }
      // Readers have not yet been tied to an independently authenticated
      // immutable store. Never assert durable provenance or production readiness.
      blockers.push("DURABLE_STORE_ATTESTATION_NOT_IMPLEMENTED");
      return Object.freeze({
        version: HYPER_DURABLE_RUNTIME_EVIDENCE_VERSION,
        verified: false,
        blockers: Object.freeze([...new Set(blockers)].sort()),
        source: "unattested-durable-reader-contract"
      });
    }
  });
}

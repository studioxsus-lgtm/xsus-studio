/**
 * Hyper v8.2.23 — trusted evidence bundle boundary.
 * A single atomic, insert-only bundle store is REQUIRED. The v8.2.19
 * evidence-only table is NOT sufficient for persisting the MAC envelope.
 * No database adapter, migration, runtime attestation or production activation.
 */
import { createHyperEvidenceProvenance } from "./hyper-v8222-evidence-provenance.js";
import { prepareHyperRuntimeEvidenceRow } from "./hyper-v8216-runtime-evidence-schema.js";

export const HYPER_TRUSTED_STORAGE_VERSION = "8.2.23";
const ID = /^[A-Za-z0-9_-]{1,128}$/;

function inputFromRow(row) {
  if (!row || typeof row !== "object") throw Error("invalid row");
  const input = {
    observationId: row.observation_id,
    serviceId: row.service_id,
    snapshot: {
      instanceId: row.instance_id, processId: row.process_id,
      startedAt: row.started_at, observedAt: row.observed_at,
      source: row.source
    }
  };
  prepareHyperRuntimeEvidenceRow(input);
  return input;
}

export function createHyperTrustedEvidenceStorage({
  key, keyId, insertBundle, readBundle, enabled = false
} = {}) {
  const provenance = createHyperEvidenceProvenance({ key, keyId });
  if (typeof insertBundle !== "function" || typeof readBundle !== "function")
    throw new TypeError("Atomic bundle storage callbacks required.");
  return Object.freeze({
    version: HYPER_TRUSTED_STORAGE_VERSION,
    productionEligible: false,
    async store(input) {
      if (enabled !== true) return Object.freeze({ stored: false, reason: "STORAGE_DISABLED" });
      try {
        const row = prepareHyperRuntimeEvidenceRow(input);
        const envelope = provenance.sign(input);
        // Callback must commit row and envelope atomically and reject duplicates.
        const result = await insertBundle(Object.freeze({ row, envelope }));
        if (result?.inserted !== true || result.observationId !== row.observation_id)
          throw Error("unconfirmed bundle");
        return Object.freeze({ stored: true, observationId: row.observation_id });
      } catch {
        return Object.freeze({ stored: false, reason: "BUNDLE_WRITE_FAILED" });
      }
    },
    async readVerified(observationId) {
      if (enabled !== true) return Object.freeze({ verified: false, reason: "STORAGE_DISABLED" });
      if (typeof observationId !== "string" || !ID.test(observationId))
        return Object.freeze({ verified: false, reason: "INVALID_OBSERVATION_ID" });
      try {
        const bundle = await readBundle(observationId);
        const input = inputFromRow(bundle?.row);
        if (input.observationId !== observationId) throw Error("identity mismatch");
        const result = provenance.verify(input, bundle.envelope);
        if (!result.verified) throw Error("MAC mismatch");
        return Object.freeze({
          verified: true, observationId,
          runtimeAttested: false, productionEligible: false,
          source: "shared-secret-mac"
        });
      } catch {
        return Object.freeze({ verified: false, reason: "BUNDLE_VERIFICATION_FAILED" });
      }
    }
  });
}

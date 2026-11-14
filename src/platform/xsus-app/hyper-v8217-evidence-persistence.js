/**
 * Hyper v8.2.17 — gated evidence persistence adapter.
 * No database connections are created here. Explicitly injected server-only
 * transport; disabled by default until schema, grants, RLS and audit are verified.
 * This module does not attest provenance or unlock production.
 */
import { prepareHyperRuntimeEvidenceRow } from "./hyper-v8216-runtime-evidence-schema.js";

export const HYPER_EVIDENCE_PERSISTENCE_VERSION = "8.2.17";
const ID = /^[A-Za-z0-9_-]{1,128}$/;

export function createHyperEvidencePersistence({
  insertRow, selectRow, enabled = false
} = {}) {
  if (typeof insertRow !== "function" || typeof selectRow !== "function")
    throw new TypeError("Persistence transport configuration invalid.");

  return Object.freeze({
    version: HYPER_EVIDENCE_PERSISTENCE_VERSION,
    async store(input) {
      if (enabled !== true)
        return Object.freeze({ stored: false, reason: "PERSISTENCE_DISABLED" });
      let row;
      try { row = prepareHyperRuntimeEvidenceRow(input); }
      catch { return Object.freeze({ stored: false, reason: "INVALID_EVIDENCE" }); }
      try {
        // Insert-only transport is required; never upsert or overwrite.
        const result = await insertRow(row);
        if (result?.inserted !== true || result.observationId !== row.observation_id)
          throw Error("insert not confirmed");
        return Object.freeze({ stored: true, observationId: row.observation_id });
      } catch {
        return Object.freeze({ stored: false, reason: "PERSISTENCE_WRITE_FAILED" });
      }
    },
    async read(observationId) {
      if (enabled !== true)
        return Object.freeze({ found: false, reason: "PERSISTENCE_DISABLED" });
      if (typeof observationId !== "string" || !ID.test(observationId))
        return Object.freeze({ found: false, reason: "INVALID_OBSERVATION_ID" });
      try {
        const row = await selectRow(observationId);
        if (!row || row.observation_id !== observationId)
          throw Error("observation not found");
        const snapshot = {
          processId: row.process_id, instanceId: row.instance_id,
          startedAt: row.started_at, observedAt: row.observed_at,
          source: row.source
        };
        const canonical = prepareHyperRuntimeEvidenceRow({
          observationId, serviceId: row.service_id, snapshot
        });
        return Object.freeze({
          found: true, observationId,
          snapshot: Object.freeze({
            observationId, processId: canonical.process_id,
            instanceId: canonical.instance_id,
            startedAt: canonical.started_at, observedAt: canonical.observed_at,
            source: canonical.source
          })
        });
      } catch {
        return Object.freeze({ found: false, reason: "PERSISTENCE_READ_FAILED" });
      }
    }
  });
}

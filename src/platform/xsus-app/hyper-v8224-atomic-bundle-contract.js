/**
 * Hyper v8.2.24 — one-row atomic bundle conversion.
 * No I/O. Reject unknown/malformed MAC fields and mismatched IDs.
 */
import { prepareHyperRuntimeEvidenceRow } from "./hyper-v8216-runtime-evidence-schema.js";
export const HYPER_ATOMIC_BUNDLE_VERSION = "8.2.24";
const HEX = /^[a-f0-9]{64}$/;
const KEY = /^[A-Za-z0-9_-]{1,64}$/;
const fields = [
  "observation_id", "service_id", "instance_id", "process_id",
  "started_at", "observed_at", "source"
];

export function prepareHyperAtomicBundle({ row, envelope } = {}) {
  if (!row || !envelope || envelope.version !== 1 ||
      envelope.algorithm !== "HMAC-SHA256" ||
      !KEY.test(envelope.keyId || "") ||
      !HEX.test(envelope.evidenceDigest || "") ||
      !HEX.test(envelope.authenticationTag || ""))
    throw new TypeError("Hyper atomic bundle invalid.");
  const normalized = prepareHyperRuntimeEvidenceRow({
    observationId: row.observation_id,
    serviceId: row.service_id,
    snapshot: {
      instanceId: row.instance_id, processId: row.process_id,
      startedAt: row.started_at, observedAt: row.observed_at,
      source: row.source
    }
  });
  if (fields.some(field => row[field] !== normalized[field]))
    throw new TypeError("Hyper atomic bundle row invalid.");
  return Object.freeze({
    ...normalized,
    envelope_version: 1,
    envelope_algorithm: "HMAC-SHA256",
    envelope_key_id: envelope.keyId,
    evidence_digest: envelope.evidenceDigest,
    authentication_tag: envelope.authenticationTag
  });
}

export function parseHyperAtomicBundle(record) {
  if (!record || typeof record !== "object")
    throw new TypeError("Hyper atomic bundle missing.");
  const row = Object.freeze(Object.fromEntries(fields.map(field => [field, record[field]])));
  const envelope = Object.freeze({
    version: record.envelope_version,
    algorithm: record.envelope_algorithm,
    keyId: record.envelope_key_id,
    evidenceDigest: record.evidence_digest,
    authenticationTag: record.authentication_tag
  });
  prepareHyperAtomicBundle({ row, envelope });
  return Object.freeze({ row, envelope });
}

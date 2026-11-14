/**
 * Hyper v8.2.21 — deterministic row digest for comparison.
 * SHA-256 detects accidental changes only when the expected digest is trusted.
 * No signature, provenance proof or production activation is provided.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { prepareHyperRuntimeEvidenceRow } from "./hyper-v8216-runtime-evidence-schema.js";

export const HYPER_EVIDENCE_INTEGRITY_VERSION = "8.2.21";

function canonical(input) {
  const row = prepareHyperRuntimeEvidenceRow(input);
  return JSON.stringify([
    row.observation_id, row.service_id, row.instance_id,
    row.process_id, new Date(row.started_at).toISOString(),
    new Date(row.observed_at).toISOString(), row.source
  ]);
}

export function digestHyperEvidence(input) {
  return createHash("sha256").update(canonical(input), "utf8").digest("hex");
}

export function compareHyperEvidence(input, expectedDigest) {
  if (typeof expectedDigest !== "string" || !/^[a-f0-9]{64}$/.test(expectedDigest))
    return Object.freeze({ matches: false, reason: "INVALID_EXPECTED_DIGEST" });
  try {
    const actual = Buffer.from(digestHyperEvidence(input), "hex");
    const expected = Buffer.from(expectedDigest, "hex");
    return Object.freeze({
      matches: timingSafeEqual(actual, expected),
      source: "unattested-digest-comparison",
      provenanceVerified: false
    });
  } catch {
    return Object.freeze({ matches: false, reason: "INVALID_EVIDENCE" });
  }
}

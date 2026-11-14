/**
 * Hyper v8.2.22 — HMAC provenance envelope (server-only).
 * The verifier trusts only a separately configured server-held secret.
 * Shared-secret MAC authenticates a holder of the key, NOT the Render runtime.
 * Never accept secret material from an HTTP request.
 * Does not unlock the production activation gate.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { digestHyperEvidence } from "./hyper-v8221-evidence-integrity.js";

export const HYPER_EVIDENCE_PROVENANCE_VERSION = "8.2.22";
const KEY_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAC = /^[a-f0-9]{64}$/;
const PURPOSE = "xsus-hyper-runtime-evidence:v1";

function validateKey(key, keyId) {
  if (!Buffer.isBuffer(key) || key.length < 32 || !KEY_ID.test(keyId || ""))
    throw new TypeError("Hyper provenance configuration invalid.");
}

function mac(key, keyId, digest) {
  return createHmac("sha256", key)
    .update(JSON.stringify([PURPOSE, keyId, digest]), "utf8")
    .digest("hex");
}

export function createHyperEvidenceProvenance({ key, keyId } = {}) {
  validateKey(key, keyId);
  const secret = Buffer.from(key);
  return Object.freeze({
    version: HYPER_EVIDENCE_PROVENANCE_VERSION,
    sign(input) {
      const digest = digestHyperEvidence(input);
      return Object.freeze({
        version: 1, algorithm: "HMAC-SHA256", keyId,
        evidenceDigest: digest, authenticationTag: mac(secret, keyId, digest)
      });
    },
    verify(input, envelope) {
      try {
        if (!envelope || envelope.version !== 1 ||
            envelope.algorithm !== "HMAC-SHA256" ||
            envelope.keyId !== keyId ||
            !MAC.test(envelope.evidenceDigest || "") ||
            !MAC.test(envelope.authenticationTag || ""))
          throw Error("envelope invalid");
        const digest = digestHyperEvidence(input);
        const suppliedDigest = Buffer.from(envelope.evidenceDigest, "hex");
        const actualDigest = Buffer.from(digest, "hex");
        const suppliedTag = Buffer.from(envelope.authenticationTag, "hex");
        const actualTag = Buffer.from(mac(secret, keyId, digest), "hex");
        const verified = timingSafeEqual(suppliedDigest, actualDigest) &&
          timingSafeEqual(suppliedTag, actualTag);
        return Object.freeze({
          verified,
          reason: verified ? "MAC_VALID" : "MAC_MISMATCH",
          runtimeAttested: false,
          productionEligible: false
        });
      } catch {
        return Object.freeze({
          verified: false, reason: "INVALID_EVIDENCE_OR_ENVELOPE",
          runtimeAttested: false, productionEligible: false
        });
      }
    }
  });
}

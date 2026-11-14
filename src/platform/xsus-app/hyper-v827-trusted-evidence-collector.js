/**
 * Hyper v8.2.7 — read-only evidence collection boundary.
 * Trusted readers must be server-owned, never sourced from HTTP request bodies.
 * This module cannot attest a Render restart or certify deployment by itself.
 */
import { verifyHyperPersistenceEvidence } from "./hyper-v826-persistence-verifier.js";

export const HYPER_TRUSTED_COLLECTOR_VERSION = "8.2.7";

export function createHyperTrustedEvidenceCollector({
  readAudit,
  readCheckpoint,
  readBeforeRestart,
  readAfterRestart,
  verifyRenderRestart
} = {}) {
  return Object.freeze({
    async inspect() {
      const blockers = [];
      if ([readAudit, readCheckpoint, readBeforeRestart,
           readAfterRestart, verifyRenderRestart].some(fn => typeof fn !== "function")) {
        return Object.freeze({
          version: HYPER_TRUSTED_COLLECTOR_VERSION,
          verified: false,
          blockers: Object.freeze(["TRUSTED_READERS_NOT_CONFIGURED"])
        });
      }
      try {
        // Each reader must independently validate its source and return only
        // minimal, non-secret observations. No writes or restarts occur here.
        const audit = await readAudit();
        const checkpoint = await readCheckpoint();
        const beforeRestart = await readBeforeRestart();
        const afterRestart = await readAfterRestart();
        const restart = await verifyRenderRestart();
        if (restart?.verified !== true) blockers.push("RENDER_RESTART_ATTESTATION_MISSING");
        const report = verifyHyperPersistenceEvidence({
          audit,
          checkpoint,
          beforeRestart,
          afterRestart,
          renderRestartConfirmed: restart?.verified === true
        });
        blockers.push(...report.blockers);
        // This checks the supplied trusted-reader contract, not the authenticity
        // of the reader implementation or a live deployment.
        return Object.freeze({
          version: HYPER_TRUSTED_COLLECTOR_VERSION,
          verified: blockers.length === 0,
          blockers: Object.freeze([...new Set(blockers)].sort()),
          source: "server-owned-readers"
        });
      } catch {
        return Object.freeze({
          version: HYPER_TRUSTED_COLLECTOR_VERSION,
          verified: false,
          blockers: Object.freeze(["TRUSTED_EVIDENCE_COLLECTION_FAILED"])
        });
      }
    }
  });
}

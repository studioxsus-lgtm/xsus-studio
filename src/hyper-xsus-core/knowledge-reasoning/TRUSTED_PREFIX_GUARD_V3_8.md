# Hyper XSUS Core v3.8 — Trusted Prefix Integrity & Fault Matrix

The v3.7 crash guard checked only the final tip when archive and
checkpoint counts matched. A longer archive could therefore conceal a
fork *before* the independently trusted checkpoint.

v3.8 adds `createIncidentPrefixGuard({directory,archive,checkpoint})`
in `incident-prefix-guard.js`. The guard authenticates the archive via
its existing verifier, then compares the checkpoint's trusted tip to the
signature at the **exact checkpoint count**, not merely the final tip.
This distinguishes:
- `ARCHIVE_ROLLBACK` — signed archive shorter than trusted checkpoint;
- `TRUSTED_PREFIX_FORK` — checkpoint sequence exists but signature differs;
- `UNANCHORED_ARCHIVE_TAIL` — valid trusted prefix with extra signed records;
- `WRITER_LOCK_REVIEW_REQUIRED` — ambiguous or interrupted writer.

A 21-case test matrix includes 40 signed appends, forks hidden by
longer archives, tampering, unexpected temporary files, malformed
checkpoint, writer lock, and concurrent snapshot mutation simulation.

The API is read-only and fail-closed. It does not automatically promote
checkpoints, remove locks, reconcile forks, or repair damaged archives.
Checkpoint authenticity and durability must be provided externally;
the guard cannot establish distributed consensus or defeat a malicious
writer racing between its filesystem reads.

All changes are on `feature/xsus-ai-core`; `main` remains unchanged.
Run `npm test` and inspect CI logs before declaring the new tests passed.

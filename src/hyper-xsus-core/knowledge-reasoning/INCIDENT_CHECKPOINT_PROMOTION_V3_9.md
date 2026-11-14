# Hyper XSUS Core v3.9 — Reviewed Checkpoint Promotion

The new `incident-checkpoint-promotion.js` adds
`createIncidentCheckpointPromotion({guard,archive,checkpoint,authorize})`.
It promotes an independently stored checkpoint only when:
1. The v3.8 guard reports **only** an unanchored authenticated tail.
2. The archive's verified prefix matches the existing checkpoint.
3. An independent reviewer explicitly returns `true`.
4. Guard, checkpoint, and archive are rechecked before CAS.
5. The checkpoint backend confirms persistence after CAS.

The module does not provide the trusted checkpoint backend, does not
automatically remove stale locks or reconcile forks, and does not
advance checkpoints without reviewer authorization.

A 16-case Vitest suite covers successful promotion, blockers,
reviewer rejection, changed assessments, CAS failures, uncertain
persistence, simultaneous attempts and repeated promotion.

The checkpoint backend must implement atomic, durable compare-and-swap
`advance(previous,next)` across all writers. This component does not
guarantee cross-process locking on its own. A crash after successful
CAS but before the confirmation read must be handled by inspection
against the independently trusted checkpoint; no blind retries.

Changes target `feature/xsus-ai-core`, not `main`.
Run `npm test` and inspect CI results before confirming v3.9.

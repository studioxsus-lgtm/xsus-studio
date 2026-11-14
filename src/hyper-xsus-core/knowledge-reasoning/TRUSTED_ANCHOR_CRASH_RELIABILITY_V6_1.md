# Hyper XSUS Core v6.1 — Trusted Anchor Crash Recovery & Reliability

This phase hardens the existing single-host trusted anchor. The
`durable-incident-checkpoint.js` writer now fails closed with
`XSUS_CHECKPOINT_PENDING` when `checkpoint.pending` already exists,
before either initialization or advancement. No stale artifact is
deleted or silently promoted. Existing checkpoint read APIs remain
unchanged.

Eight new regression/stress scenarios cover:
- Five real subprocess SIGKILL interruptions after committed anchor
  updates, with independent fresh-process recovery checks.
- SIGKILL while reviewer authorization is pending (no advancement).
- Interrupted checkpoint pending-file residue and lock preservation.
- Twelve concurrent advancement attempts with one successful CAS.
- Thirty fresh-instance monotonic advancement cycles.
- Valid signed audit rollback detected against retained anchor.
- Ten unauthorized advancement attempts preserving anchor bytes.

The child processes intentionally keep Node's event loop alive after
writing their marker, so SIGKILL actually interrupts a running
process. These tests do not simulate a kill inside every fsync/rename
boundary. The signed anchor is not an external trust authority merely
because it uses another local directory. No automatic repair, lock
stealing, or promotion is performed.

Run `npm test` in GitHub Actions before confirming v6.1. Only
`feature/xsus-ai-core` changed; `main` is untouched.

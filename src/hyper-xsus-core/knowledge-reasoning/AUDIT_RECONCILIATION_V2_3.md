# Hyper XSUS Core v2.3.0 — Explicit pending-anchor reconciliation

`createAuditReconciler({anchors,highWater,lease,authorize})`
provides `reconcile(snapshot)`. It is an opt-in recovery operation
and does not modify v1.9–v2.2 APIs.

Recovery requires: a signed latest checkpoint that verifies against
the supplied journal snapshot; a latest sequence strictly greater than
the independently trusted high-water mark; an external reviewer
returning literal `true`; and an atomic high-water CAS update that
rejects expired/stale fencing tokens. Otherwise the operation fails
closed. A matching committed checkpoint is not considered pending.

**Trust boundary:** `authorize` must be backed by a real independent
review process; a callback that always returns true is not sufficient
for production. `highWater.advance(expected,next,token)` must be
durable and atomically fenced by the backend. The in-process busy guard
does not substitute for a distributed lease. Recovery does not repair
truncated checkpoint files, verify the entire journal beyond the
anchor verifier's guarantees, or establish a production distributed
backend. Manual incident review remains required.

Run `npm test` and inspect the nine v2.3 unit tests. Live multi-host
fencing and recovery drills remain outstanding.

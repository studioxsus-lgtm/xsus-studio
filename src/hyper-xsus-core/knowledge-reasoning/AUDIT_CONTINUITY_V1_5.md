# Hyper XSUS Core v1.5.0 — Audit history continuity

## Scope
Before appending under the writer lock, compare the reloaded journal with
the last in-memory committed snapshot. Reject a lower lastSequence with
XSUS_AUDIT_ROLLBACK. Reject a divergent known tip hash with
XSUS_AUDIT_FORK when the corresponding sequence is still observable in
retained entries or the immediately following retention anchor.

A failed continuity check fails the audit instance closed. The journal
format and public version remain v0.8.0 for compatibility. Normal
multi-instance advancement is allowed.

## Boundaries
These checks only protect an instance that has already observed a valid
journal tip. They do not detect tampering performed before its first load,
a fully rewritten history whose known tip has fallen outside the
retention window, or malicious writes by an actor controlling the audit
directory. There is no external signed anchor. The current lock release
check still has a check-to-unlink race. Production certification remains
pending.

## Verification
Run `npm test` on feature/xsus-ai-core. The new focused test file
covers valid rollback, valid same-sequence fork, and multi-instance
forward progress. Verify against actual storage and recovery policies.

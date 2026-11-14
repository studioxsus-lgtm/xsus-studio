# Hyper XSUS Core v2.1.0 — Fenced audit coordination

`createFencedAuditCoordinator({anchors,highWater,lease})` exposes
`inspect(snapshot)` and `advance(snapshot)`.

**Required independently operated provider contracts:**

- `lease.acquire()` returns an opaque, non-null fencing token.
- `lease.release(token)` releases only that lease.
- `highWater.read()` returns a trusted durable sequence.
- `highWater.advance(expected,next,token)` MUST atomically verify
  the expected sequence AND reject expired or stale fencing tokens.
- `anchors.list/verify/rotate` use the v1.9 signed anchor interface.

The coordinator rejects a missing/deleted checkpoint, a checkpoint
ahead of the committed high-water mark, invalid signatures, stale
fencing tokens (when the backend rejects them), and nonmonotonic
updates. A checkpoint written before a failed CAS is left PENDING for
manual incident reconciliation; it is not silently accepted.

**Not production-complete:** no concrete distributed lease service,
fencing-enforcing high-water backend, automatic crash reconciliation,
or journal-writer fencing is implemented here. Local in-process
`busy` is only a reentrancy guard, not distributed locking. Provider
must protect the same trust domain as the checkpoint rotation and
high-water mark. A lease expiry after anchor creation can leave a
PENDING checkpoint and requires operator review.

Run the eight focused tests and the full suite. Real multiprocess,
SIGKILL, lease-expiry and external backend integration tests remain
necessary before production deployment.

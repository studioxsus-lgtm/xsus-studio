# Replay reservation store V6

The reference implementation provides an atomic in-process `reserve`
operation with three results: `reserved`, `duplicate`, `capacity`.
Reservations use (trusted subject, request ID) keys and aware expiry times.
The implementation supports release and lazy expiry cleanup.

**Not a distributed store.** A future Redis/Postgres implementation must
preserve atomic insert-if-absent with TTL, capacity behavior and safe ownership
of release operations. The current `release` is not ownership-token protected,
so it must not be exposed to untrusted callers or used for distributed
reservation release. This module is not yet wired into the production gateway.

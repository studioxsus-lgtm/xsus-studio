# Distributed lease-store contract V6

`LeaseStoreV6` defines two operations for a future shared backend:
atomic reserve-if-absent with expiry and an opaque owner token; and atomic
compare-token-and-delete release. `OwnedReplayStoreV6` is the in-process
reference implementation.

`check_lease_store_behavior_v6` is an opt-in mutating smoke test, not a
distributed safety proof. Use only against an isolated test namespace.
It checks duplicate rejection and wrong-owner release.

A Redis/PostgreSQL implementation must additionally demonstrate atomicity
across workers, crash recovery, TTL correctness under clock skew, capacity
handling, fencing/renewal for long-running work, and observability.
No external backend, connection credentials, or production endpoint is
created by this change.

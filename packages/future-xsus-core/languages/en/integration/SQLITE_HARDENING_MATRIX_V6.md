# SQLite V6 expanded hardening matrix

This package adds three focused test suites:

- Transaction invariants: duplicate inserts, rollback-safe validation,
  token-conditioned release, expiry cleanup and microsecond boundaries.
- Parallel connections: contention on one key, independent identities,
  concurrent release, and expiry replacement.
- Time correctness: UTC offset normalization, subsecond expiry and
  rejection of naive timestamps.

The tests run on isolated temporary SQLite files and use no production
credentials. Passing them does not establish multi-host atomicity,
network filesystem safety, true power-loss durability, trusted clocks,
or distributed fencing. The experimental backend is not wired into
XSUS App or public API routes.

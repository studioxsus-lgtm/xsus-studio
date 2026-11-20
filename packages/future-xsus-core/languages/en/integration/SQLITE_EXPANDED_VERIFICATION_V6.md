# Expanded SQLite verification V6

Three additional test modules cover:
1. Transaction rollback/commit boundaries, reopening and owner safety.
2. Data-volume characterization (100 reservations, cleanup and releases).
3. Ownership-token rotation, stale-token rejection and subject isolation.

All tests use isolated temporary SQLite files. The volume tests do not
constitute throughput benchmarks and the SQLite reference implementation
has **no maximum entry count**. A real production service needs an
enforced quota, trusted clock, backpressure, monitoring and retention
policy. These tests do not simulate disk power loss, corruption, remote
filesystems or multi-host failures. No XSUS App or Hyper XSUS Core
integration is modified.

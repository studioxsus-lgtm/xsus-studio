# Hyper XSUS Core v2.4.0 — Integration stress harness

Seven deterministic tests exercise the v2.1 fenced coordinator and
v2.3 explicit reconciler together, using a shared simulated backend:

- 100 sequential advances with no high-water regression
- two competing coordinator instances, allowing fail-closed PENDING
  state rather than falsely requiring a winner
- detection and approved reconciliation of pending anchors
- denial of unapproved reconciliation
- detection of committed-checkpoint deletion
- expired fencing token after rotation
- 50 sequential approved recoveries

The shared backend is an **in-process simulation**, not a real
distributed CAS or lease service. These tests do not prove cross-host
mutual exclusion or safety under actual network partitions. The
separate v2.2 tests cover SIGKILL process boundaries. Production
qualification still requires real remote storage, atomic fencing,
durability tests and fault injection across hosts.

Run `npm test` and confirm results before marking v2.4 verified.

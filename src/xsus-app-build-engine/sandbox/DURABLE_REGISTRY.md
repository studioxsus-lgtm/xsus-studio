# Phase 34 — Durable execution registry contract

Adds execution ownership, state transitions, optimistic revision checks and monotonic fencing tokens. The storage adapter must provide atomic `createIfAbsent`, `read` and `compareAndSwap` methods. No persistent database implementation is included yet. Test storage is an in-memory fake and **not durable**.

This registry is a prerequisite for recovery coordination, not a complete recovery safety system. Every downstream destructive action must enforce the current fence token and verify ownership using a trusted provider; merely checking the token in this registry is insufficient. Cross-process leases, transactional ownership binding, crash recovery, idempotent cleanup and durable audit records remain to be implemented and verified.

Never use a plain read-modify-write store without atomic CAS. Do not enable automatic cleanup in production based solely on this module.

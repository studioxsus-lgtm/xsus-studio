# Replay Guard V6 — recovery verification

The regression suite covers reservations released after exceptions, rejected
requests, exhausted budgets, and expiry, alongside retained reservations for
successful requests. It also checks subject isolation and capacity recovery.

This in-memory implementation serializes dispatches under one process lock.
It does not provide distributed atomicity, process-crash recovery, durable
idempotency, network timeouts, or guaranteed exactly-once execution.
Production integration needs a shared atomic TTL store and an external
idempotency strategy. No production route is enabled.

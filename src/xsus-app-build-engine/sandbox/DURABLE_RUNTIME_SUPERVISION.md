# Phase 43 — Durable runtime supervision

The read-only supervisor correlates a durable execution snapshot, its latest audit head, a trusted host observation and a durable lease. It distinguishes terminal records, healthy running executions, uncertain outcomes and expired/absent executions requiring manual reconciliation.

**No automatic retry, failure transition, cleanup, or deletion is performed.** Host observation and lease storage are injected dependencies; this module does not establish their trustworthiness. An expired lease plus absent container is only a signal for manual review, not proof that the workload never ran. The module checks only the audit head, not the complete hash chain, and does not atomically snapshot host/lease/database state. Real durable leases, host identity attestation, process restart tests and fencing enforcement are required before recovery automation.

Tests use mocked providers and have not been confirmed against live infrastructure.
